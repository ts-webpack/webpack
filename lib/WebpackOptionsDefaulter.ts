/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import OptionsDefaulter = require('./OptionsDefaulter');
import Template = require('./Template');
import { WebpackOptions } from '../typings/webpack-types'

class WebpackOptionsDefaulter extends OptionsDefaulter {
    constructor() {
        super();
        this.set('devtool', false);
        this.set('cache', true);

        this.set('context', process.cwd());
        this.set('target', 'web');

        this.set('module.unknownContextRequest', '.');
        this.set('module.unknownContextRegExp', false);
        this.set('module.unknownContextRecursive', true);
        this.set('module.unknownContextCritical', true);
        this.set('module.exprContextRequest', '.');
        this.set('module.exprContextRegExp', false);
        this.set('module.exprContextRecursive', true);
        this.set('module.exprContextCritical', true);
        this.set('module.wrappedContextRegExp', /.*/);
        this.set('module.wrappedContextRecursive', true);
        this.set('module.wrappedContextCritical', false);

        this.set('output', 'call', (value: any, options: WebpackOptions) => {
            if (typeof value === 'string') {
                return {
                    filename: value
                };
            }
            else if (typeof value !== 'object') {
                return {};
            }
            else {
                return value;
            }
        });
        this.set('output.filename', '[name].js');
        this.set('output.chunkFilename', 'make', function (options: WebpackOptions) {
            const filename = options.output.filename;
            return filename.includes('[name]') ? filename.replace('[name]', '[id]') : `[id].${filename}`;
        });
        this.set('output.library', '');
        this.set('output.hotUpdateFunction', 'make', (options: WebpackOptions) =>
            Template.toIdentifier(`webpackHotUpdate${options.output.library}`));
        this.set('output.jsonpFunction', 'make', (options: WebpackOptions) =>
            Template.toIdentifier(`webpackJsonp${options.output.library}`));
        this.set('output.libraryTarget', 'var');
        this.set('output.path', process.cwd());
        this.set('output.sourceMapFilename', '[file].map[query]');
        this.set('output.hotUpdateChunkFilename', '[id].[hash].hot-update.js');
        this.set('output.hotUpdateMainFilename', '[hash].hot-update.json');
        this.set('output.crossOriginLoading', false);
        this.set('output.hashFunction', 'md5');
        this.set('output.hashDigest', 'hex');
        this.set('output.hashDigestLength', 20);
        this.set('output.devtoolLineToLine', false);
        this.set('output.strictModuleExceptionHandling', false);

        this.set('node', {});
        this.set('node.console', false);
        this.set('node.process', true);
        this.set('node.global', true);
        this.set('node.Buffer', true);
        this.set('node.setImmediate', true);
        this.set('node.__filename', 'mock');
        this.set('node.__dirname', 'mock');

        this.set('performance.maxAssetSize', 250000);
        this.set('performance.maxInitialChunkSize', 250000);
        this.set('performance.errorOnHint', false);
        this.set('performance.hints', 'make', function (options: WebpackOptions) {
            return options.target === 'web';
        });

        this.set('resolve', {});
        this.set('resolve.unsafeCache', true);
        this.set('resolve.modules', ['node_modules']);
        this.set('resolve.extensions', ['.js', '.json']);
        this.set('resolve.aliasFields', 'make', (options: WebpackOptions) => {
            if (options.target === 'web' || options.target === 'webworker') {
                return ['browser'];
            }
            else {
                return [];
            }
        });
        this.set('resolve.mainFields', 'make', (options: WebpackOptions) => {
            if (options.target === 'web' || options.target === 'webworker') {
                return ['browser', 'module', 'main'];
            }
            else {
                return ['module', 'main'];
            }
        });

        this.set('resolveLoader', {});
        this.set('resolveLoader.unsafeCache', true);
        this.set('resolveLoader.mainFields', ['loader', 'main']);
        this.set('resolveLoader.extensions', ['.js', '.json']);
    }
}

export = WebpackOptionsDefaulter;
