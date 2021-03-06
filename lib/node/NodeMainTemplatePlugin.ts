/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Template = require('../Template');
import Chunk = require('../Chunk')
import MainTemplate = require('../MainTemplate')
import { Hash } from 'crypto'

class NodeMainTemplatePlugin {
    constructor(public asyncChunkLoading: boolean) {
    }

    apply(mainTemplate: MainTemplate) {
        const self = this;
        mainTemplate.plugin('local-vars', function (source: string, chunk: Chunk) {
            if (chunk.chunks.length > 0) {
                return this.asString([
                    source,
                    '',
                    '// object to store loaded chunks',
                    '// \\"0\\" means \\"already loaded\\"',
                    'var installedChunks = {',
                    this.indent(chunk.ids.map(id => `${id}: 0`).join(',\n')),
                    '};'
                ]);
            }
            return source;
        });
        mainTemplate.plugin('require-extensions', function (source: string, chunk: Chunk) {
            if (chunk.chunks.length > 0) {
                return this.asString([
                    source,
                    '',
                    '// uncatched error handler for webpack runtime',
                    `${this.requireFn}.oe = function(err) {`,
                    this.indent([
                        'process.nextTick(function() {',
                        this.indent('throw err; // catch this error by using System.import().catch()'),
                        '});'
                    ]),
                    '};'
                ]);
            }
            return source;
        });
        mainTemplate.plugin('require-ensure', function (source: string, chunk: Chunk, hash: string) {
            const chunkFilename = this.outputOptions.chunkFilename;
            const chunkMaps = chunk.getChunkMaps();
            const insertMoreModules = [
                'var moreModules = chunk.modules, chunkIds = chunk.ids;',
                'for(var moduleId in moreModules) {',
                this.indent(this.renderAddModule(hash, chunk, 'moduleId', 'moreModules[moduleId]')),
                '}'
            ];
            if (self.asyncChunkLoading) {
                return this.asString([
                    '// \"0\" is the signal for \"already loaded\"',
                    'if(installedChunks[chunkId] === 0)',
                    this.indent(['return Promise.resolve();']),
                    '// array of [resolve, reject, promise] means \"currently loading\"',
                    'if(installedChunks[chunkId])',
                    this.indent(['return installedChunks[chunkId][2];']),
                    '// load the chunk and return promise to it',
                    'var promise = new Promise(function(resolve, reject) {',
                    this.indent([
                        'installedChunks[chunkId] = [resolve, reject];',
                        `var filename = __dirname + ${this.applyPluginsWaterfall('asset-path', JSON.stringify('/' + chunkFilename), {
                            hash: '\" + ' + this.renderCurrentHashCode(hash) + ' + \"',
                            hashWithLength: (length: number) => '\" + ' + this.renderCurrentHashCode(hash, length) + ' + \"',
                            chunk: {
                                id: '\" + chunkId + \"',
                                hash: '\" + ' + JSON.stringify(chunkMaps.hash) + '[chunkId] + \"',
                                hashWithLength(length: number) {
                                    const shortChunkHashMap = {};
                                    Object.keys(chunkMaps.hash).forEach(chunkId => {
                                        if (typeof chunkMaps.hash[chunkId] === 'string') {
                                            shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
                                        }
                                    });
                                    return '\" + ' + JSON.stringify(shortChunkHashMap) + '[chunkId] + \"';
                                },
                                name: '\" + (' + JSON.stringify(chunkMaps.name) + '[chunkId]||chunkId) + \"'
                            }
                        })};`,
                        'require(\'fs\').readFile(filename, \'utf-8\',  function(err, content) {',
                        this.indent([
                            'if(err) return reject(err);', 'var chunk = {};',
                            'require(\'vm\').runInThisContext(\'(function(exports, require, __dirname, __filename) {\' + content + \'\\n})\', filename)' + '(chunk, require, require(\'path\').dirname(filename), filename);'
                        ]
                            .concat(insertMoreModules)
                            .concat([
                                'var callbacks = [];',
                                'for(var i = 0; i < chunkIds.length; i++) {',
                                this.indent([
                                    'if(installedChunks[chunkIds[i]])',
                                    this.indent(['callbacks = callbacks.concat(installedChunks[chunkIds[i]][0]);']),
                                    'installedChunks[chunkIds[i]] = 0;'
                                ]),
                                '}',
                                'for(i = 0; i < callbacks.length; i++)',
                                this.indent('callbacks[i]();')
                            ])),
                        '});'
                    ]),
                    '});',
                    'return installedChunks[chunkId][2] = promise;'
                ]);
            }
            else {
                const request = this.applyPluginsWaterfall('asset-path', JSON.stringify(`./${chunkFilename}`), {
                    hash: `\" + ${this.renderCurrentHashCode(hash)} + \"`,
                    hashWithLength: (length: number) => `\" + ${this.renderCurrentHashCode(hash, length)} + \"`,
                    chunk: {
                        id: '\" + chunkId + \"',
                        hash: `\" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + \"`,
                        hashWithLength(length: number) {
                            const shortChunkHashMap = {};
                            Object.keys(chunkMaps.hash).forEach(chunkId => {
                                if (typeof chunkMaps.hash[chunkId] === 'string') {
                                    shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
                                }
                            });
                            return `\" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + \"`;
                        },
                        name: `\" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + \"`
                    }
                });
                return this.asString([
                    '// \"0\" is the signal for \"already loaded\"',
                    'if(installedChunks[chunkId] !== 0) {',
                    this.indent([`var chunk = require(${request});`].concat(insertMoreModules).concat([
                        'for(var i = 0; i < chunkIds.length; i++)',
                        this.indent('installedChunks[chunkIds[i]] = 0;')
                    ])),
                    '}',
                    'return Promise.resolve();'
                ]);
            }
        });
        mainTemplate.plugin('hot-bootstrap', function (source: string, chunk: Chunk, hash: string) {
            const hotUpdateChunkFilename = this.outputOptions.hotUpdateChunkFilename;
            const hotUpdateMainFilename = this.outputOptions.hotUpdateMainFilename;
            const chunkMaps = chunk.getChunkMaps();
            const currentHotUpdateChunkFilename = this.applyPluginsWaterfall('asset-path', JSON.stringify(hotUpdateChunkFilename), {
                hash: `\" + ${this.renderCurrentHashCode(hash)} + \"`,
                hashWithLength: (length: number) => `\" + ${this.renderCurrentHashCode(hash, length)} + \"`,
                chunk: {
                    id: '\" + chunkId + \"',
                    hash: `\" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + \"`,
                    hashWithLength(length: number) {
                        const shortChunkHashMap = {};
                        Object.keys(chunkMaps.hash).forEach(chunkId => {
                            if (typeof chunkMaps.hash[chunkId] === 'string') {
                                shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
                            }
                        });
                        return `\" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + \"`;
                    },
                    name: `\" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + \"`
                }
            });
            const currentHotUpdateMainFilename = this.applyPluginsWaterfall(
                'asset-path',
                JSON.stringify(hotUpdateMainFilename),
                {
                    hash: `\" + ${this.renderCurrentHashCode(hash)} + \"`,
                    hashWithLength: (length: number) => `\" + ${this.renderCurrentHashCode(hash, length)} + \"`
                }
            );
            return Template
                .getFunctionContent(self.asyncChunkLoading
                    ? require('./NodeMainTemplateAsync.runtime.js')
                    : require('./NodeMainTemplate.runtime.js')
                )
                .replace(/\$require\$/g, this.requireFn)
                .replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
                .replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename);
        });
        mainTemplate.plugin('hash', function (hash: Hash) {
            hash.update('node');
            hash.update('3');
            hash.update(`${this.outputOptions.filename}`);
            hash.update(`${this.outputOptions.chunkFilename}`);
        });
    }
}

export = NodeMainTemplatePlugin;
