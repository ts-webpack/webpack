/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { ConcatSource, Source } from 'webpack-sources'
import { Hash } from 'crypto'
import ModuleTemplate = require('./ModuleTemplate')
import Module = require('./Module')

class FunctionModuleTemplatePlugin {
    apply(moduleTemplate: ModuleTemplate) {
        moduleTemplate.plugin('render', function (moduleSource: Source, module: Module) {
            const source = new ConcatSource();
            const defaultArguments = ['module', 'exports'];
            // todo: there is no arguments assignment in the repo
            if (module.arguments && module.arguments.length !== 0 || module.hasDependencies()) {
                defaultArguments.push('__webpack_require__');
            }
            source.add(`/***/ function(${defaultArguments.concat(module.arguments || []).join(', ')}) {\n\n`);
            if (module.strict) {
                source.add('"use strict";\n');
            }
            source.add(moduleSource);
            source.add('\n\n/***/ }');
            return source;
        });
        moduleTemplate.plugin('package', function (moduleSource: Source, module: Module) {
            if (this.outputOptions.pathinfo) {
                const source = new ConcatSource();
                const req = module.readableIdentifier(this.requestShortener);
                if (Array.isArray(module.providedExports)) {
                    source.add(`/* exports provided: ${module.providedExports.join(', ')} */\n`);
                }
                else if (module.providedExports) {
                    source.add('/* unknown exports provided */\n');
                }
                if (Array.isArray(module.usedExports)) {
                    source.add(`/* exports used: ${module.usedExports.join(', ')} */\n`);
                }
                else if (module.usedExports) {
                    source.add('/* all exports used */\n');
                }
                source.add(`/*!****${req.replace(/./g, '*')}****!*\\\n`);
                source.add(`  !*** ${req.replace(/\*\//g, '*_/')} ***!\n`);
                source.add(`  \\****${req.replace(/./g, '*')}****/\n`);
                source.add(moduleSource);
                return source;
            }
            return moduleSource;
        });
        moduleTemplate.plugin('hash', function (hash: Hash) {
            hash.update('FunctionModuleTemplatePlugin');
            hash.update('2');
        });
    }
}

export = FunctionModuleTemplatePlugin;
