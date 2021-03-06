/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AMDRequireContextDependency = require('./AMDRequireContextDependency')
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions } from '../../typings/webpack-types'
import RequestShortener = require('../RequestShortener')
import SystemImportContextDependency = require('./ImportContextDependency')
import CommonJsRequireContextDependency = require('./CommonJsRequireContextDependency')

type RequireContextDependency =
    AMDRequireContextDependency
    | SystemImportContextDependency
    | CommonJsRequireContextDependency

class ContextDependencyTemplateAsRequireCall {
    apply(
        dep: RequireContextDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const comment = outputOptions.pathinfo ? `/*! ${requestShortener.shorten(dep.request)} */ ` : '';
        const containsDeps = dep.module && dep.module.dependencies && dep.module.dependencies.length > 0;
        const isAsync = dep.module && dep.module.async;
        if (dep.module && (isAsync || containsDeps)) {
            if (dep.valueRange) {
                if (Array.isArray(dep.replaces)) {
                    for (const rep of dep.replaces) {
                        source.replace(rep.range[0], rep.range[1] - 1, rep.value)
                    }
                }
                source.replace(dep.valueRange[1], dep.range[1] - 1, ')');
                source.replace(dep.range[0],
                    dep.valueRange[0] - 1, `__webpack_require__(${comment}${JSON.stringify(dep.module.id)})(${
                        typeof dep.prepend === 'string' ? JSON.stringify(dep.prepend) : ''}`);
            }
            else {
                source.replace(dep.range[0], dep.range[1] - 1, `__webpack_require__(${comment}${JSON.stringify(dep.module.id)})`);
            }
        }
        else {
            const content = require('./WebpackMissingModule').module(dep.request);
            source.replace(dep.range[0], dep.range[1] - 1, content);
        }
    }
}

export = ContextDependencyTemplateAsRequireCall;
