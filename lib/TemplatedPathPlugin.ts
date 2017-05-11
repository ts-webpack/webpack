/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Jason Anderson @diurnalist
 */
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import Chunk = require('./Chunk')
import { Hash } from 'crypto'

const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi;
const REGEXP_CHUNKHASH = /\[chunkhash(?::(\d+))?\]/gi;
const REGEXP_NAME = /\[name\]/gi;
const REGEXP_ID = /\[id\]/gi;
const REGEXP_FILE = /\[file\]/gi;
const REGEXP_QUERY = /\[query\]/gi;

const REGEXP_FILEBASE = /\[filebase\]/gi;

// Using global RegExp for .test is dangerous
// We use a normal RegExp instead of .test
const REGEXP_HASH_FOR_TEST = new RegExp(REGEXP_HASH.source, 'i');
const REGEXP_CHUNKHASH_FOR_TEST = new RegExp(REGEXP_CHUNKHASH.source, 'i');
const REGEXP_NAME_FOR_TEST = new RegExp(REGEXP_NAME.source, 'i');

class TemplatedPathPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation) {
            const mainTemplate = compilation.mainTemplate;

            mainTemplate.plugin('asset-path', replacePathVariables);

            mainTemplate.plugin('global-hash', function (chunk: Chunk, paths: string[]) {
                const outputOptions = this.outputOptions;
                const publicPath = outputOptions.publicPath || '';
                const filename = outputOptions.filename || '';
                const chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
                if (REGEXP_HASH_FOR_TEST.test(publicPath) || REGEXP_CHUNKHASH_FOR_TEST.test(publicPath) || REGEXP_NAME_FOR_TEST.test(publicPath)) {
                    return true;
                }
                if (REGEXP_HASH_FOR_TEST.test(filename)) {
                    return true;
                }
                if (REGEXP_HASH_FOR_TEST.test(chunkFilename)) {
                    return true;
                }
                if (REGEXP_HASH_FOR_TEST.test(paths.join('|'))) {
                    return true;
                }
            });

            mainTemplate.plugin('hash-for-chunk', function (hash: Hash, chunk: Chunk) {
                const outputOptions = this.outputOptions;
                const chunkFilename = outputOptions.chunkFilename || outputOptions.filename;
                if (REGEXP_CHUNKHASH_FOR_TEST.test(chunkFilename)) {
                    hash.update(JSON.stringify(chunk.getChunkMaps(true, true).hash));
                }
                if (REGEXP_NAME_FOR_TEST.test(chunkFilename)) {
                    hash.update(JSON.stringify(chunk.getChunkMaps(true, true).name));
                }
            });
        });
    }
}

export = TemplatedPathPlugin;

function withHashLength(replacer: (match: string) => string, handlerFn: (length: number) => string) {
    return function (_: string, hashLength: string) {
        const length = hashLength && parseInt(hashLength, 10);

        if (length && handlerFn) {
            return handlerFn(length);
        }

        const hash = replacer.apply(this, arguments);

        return length ? hash.slice(0, length) : hash;
    };
}

function getReplacer(value: string, allowEmpty?: boolean) {
    return function (match: string) {
        // last argument in replacer is the entire input string
        const input = arguments[arguments.length - 1];
        if (value == null) {
            if (!allowEmpty) {
                throw new Error(`Path variable ${match} not implemented in this context: ${input}`);
            }
            return '';
        }
        else {
            return `${value}`;
        }
    };
}

function replacePathVariables(path: string, data: {
                                  hash: string
                                  hashWithLength: (length: number) => string
                                  chunk: {
                                      id: string
                                      hash: string
                                      renderedHash: string
                                      hashWithLength: (length: number) => string
                                      name: string
                                  }
                                  noChunkHash: boolean
                                  filename: string
                                  basename: string
                                  query?: string
                              }) {
    const chunk = data.chunk;
    const chunkId = chunk && chunk.id;
    const chunkName = chunk && (chunk.name || chunk.id);
    const chunkHash = chunk && (chunk.renderedHash || chunk.hash);
    const chunkHashWithLength = chunk && chunk.hashWithLength;

    if (data.noChunkHash && REGEXP_CHUNKHASH_FOR_TEST.test(path)) {
        throw new Error(`Cannot use [chunkhash] for chunk in '${path}' (use [hash] instead)`);
    }

    return path.replace(REGEXP_HASH, withHashLength(getReplacer(data.hash), data.hashWithLength))
        .replace(REGEXP_CHUNKHASH, withHashLength(getReplacer(chunkHash), chunkHashWithLength))
        .replace(REGEXP_ID, getReplacer(chunkId))
        .replace(REGEXP_NAME, getReplacer(chunkName))
        .replace(REGEXP_FILE, getReplacer(data.filename))
        .replace(REGEXP_FILEBASE, getReplacer(data.basename))
        // query is optional, it's OK if it's in a path but there's nothing to replace it with
        .replace(REGEXP_QUERY, getReplacer(data.query, true));
}
