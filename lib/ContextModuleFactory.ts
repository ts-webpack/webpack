/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import async = require('async');
import path = require('path');
import Tapable = require('tapable');
import ContextModule = require('./ContextModule');
import ContextElementDependency = require('./dependencies/ContextElementDependency');
import ContextDependency = require('./dependencies/ContextDependency')
import { AbstractInputFileSystem } from 'enhanced-resolve/lib/common-types'
import { Stats } from 'fs'
import { AlternativeModule, CMFBeforeResolveResult, ErrCallback } from '../typings/webpack-types'
import Compiler = require('./Compiler')

class ContextModuleFactory extends Tapable {
    constructor(public resolvers: Compiler.Resolvers) {
        super();
    }

    create(data: {
               context: string
               dependencies: [ContextDependency]
           }, callback: ErrCallback) {
        const module = this;
        const context = data.context;
        const dependencies = data.dependencies;
        const dependency = dependencies[0];
        this.applyPluginsAsyncWaterfall('before-resolve', {
            context,
            request: dependency.request,
            recursive: dependency.recursive,
            regExp: dependency.regExp,
            async: dependency.async,
            dependencies
        } as CMFBeforeResolveResult, (err, result: CMFBeforeResolveResult) => {
            if (err) {
                return callback(err);
            }

            // Ignored
            if (!result) {
                return callback();
            }

            const context = result.context;
            const request = result.request;
            const recursive = result.recursive;
            const regExp = result.regExp;
            const asyncContext = result.async;
            const dependencies = result.dependencies;

            let loaders: string[];
            let resource: string;
            let loadersPrefix = '';
            const idx = request.lastIndexOf('!');
            if (idx >= 0) {
                let loaderStr = request.substr(0, idx + 1);
                let i = 0
                for (; i < loaderStr.length && loaderStr[i] === '!'; i++) {
                    loadersPrefix += '!';
                }
                loaderStr = loaderStr.substr(i).replace(/!+$/, '').replace(/!!+/g, '!');
                if (loaderStr === '') {
                    loaders = [];
                }
                else {
                    loaders = loaderStr.split('!');
                }
                resource = request.substr(idx + 1);
            }
            else {
                loaders = [];
                resource = request;
            }

            const resolvers = module.resolvers;

            async.parallel([
                callback => {
                    resolvers.context.resolve({}, context, resource, (err: Error, result: string) => {
                        if (err) {
                            return callback(err);
                        }
                        callback(null, result);
                    });
                },
                callback => {
                    async.map(loaders, (loader, callback) => {
                        resolvers.loader.resolve({}, context, loader, (err: Error, result: string) => {
                            if (err) {
                                return callback(err, null);
                            }
                            callback(null, result);
                        });
                    }, callback);
                }
            ], (err: Error, result: [string, string[]]) => {
                if (err) {
                    return callback(err);
                }

                module.applyPluginsAsyncWaterfall('after-resolve', {
                    loaders: loadersPrefix + result[1].join('!') + (result[1].length > 0 ? '!' : ''),
                    resource: result[0],
                    recursive,
                    regExp,
                    async: asyncContext,
                    dependencies,
                    resolveDependencies: module.resolveDependencies.bind(module)
                }, (err, result) => {
                    if (err) {
                        return callback(err);
                    }

                    // Ignored
                    if (!result) {
                        return callback();
                    }

                    return callback(null, new ContextModule(result.resolveDependencies, result.resource, result.recursive, result.regExp, result.loaders, result.async, dependency.chunkName));
                });
            });
        });
    }

    resolveDependencies(fs: AbstractInputFileSystem, resource: string, recursive: boolean, regExp: RegExp,
                        callback: ErrCallback
    ) {
        if (!regExp || !resource) {
            return callback(null, []);
        }
        (function addDirectory(directory: string, callback: ErrCallback) {
            fs.readdir(directory, (err: Error, files: string[]) => {
                if (err) {
                    return callback(err);
                }
                if (!files || files.length === 0) {
                    return callback(null, []);
                }
                async.map(
                    files.filter(p => p.indexOf('.') !== 0),
                    (seqment, callback: (err?: Error, result?: any) => void) => {
                        const subResource = path.join(directory, seqment);

                        fs.stat(subResource, (err: Error, stat: Stats) => {
                            if (err) {
                                return callback(err);
                            }

                            if (stat.isDirectory()) {

                                if (!recursive) {
                                    return callback();
                                }
                                addDirectory.call(this, subResource, callback);
                            }
                            else if (stat.isFile()) {

                                const obj = {
                                    context: resource,
                                    request: `.${subResource.substr(resource.length).replace(/\\/g, '/')}`
                                };

                                this.applyPluginsAsyncWaterfall('alternatives', [obj], (
                                    err: Error,
                                    alternatives: AlternativeModule[]
                                ) => {
                                    if (err) {
                                        return callback(err);
                                    }
                                    const newAlternatives = alternatives
                                        .filter(obj => regExp.test(obj.request))
                                        .map(obj => {
                                            const dep = new ContextElementDependency(obj.request);
                                            dep.optional = true;
                                            return dep;
                                        });
                                    callback(null, newAlternatives);
                                });
                            }
                            else {
                                callback();
                            }
                        });
                    },
                    (err, result: string[]) => {
                        if (err) {
                            return callback(err);
                        }

                        if (!result) {
                            return callback(null, []);
                        }

                        callback(
                            null,
                            result.filter(i => !!i)
                                .reduce((a, i) => a.concat(i), [])
                        );
                    }
                );
            });
        }).call(this, resource, callback);
    }
}

export = ContextModuleFactory;
