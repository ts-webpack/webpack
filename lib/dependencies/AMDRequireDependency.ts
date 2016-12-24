/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import NullDependency = require('./NullDependency');
import DepBlockHelpers = require('./DepBlockHelpers');
import { ReplaceSource } from 'webpack-sources'
import { WebpackOutputOptions } from '../../typings/webpack-types'
import RequestShortener = require('../RequestShortener')
import AMDRequireDependenciesBlock = require('./AMDRequireDependenciesBlock')

class Template {
    apply(
        dep: AMDRequireDependency,
        source: ReplaceSource,
        outputOptions: WebpackOutputOptions,
        requestShortener: RequestShortener
    ) {
        const depBlock = dep.block;
        const wrapper = DepBlockHelpers.getLoadDepBlockWrapper(depBlock, outputOptions, requestShortener, 'require');
        if (depBlock.arrayRange && !depBlock.functionRange) {
            source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, `${wrapper[0]}function() {`);
            source.replace(depBlock.arrayRange[1], depBlock.outerRange[1] - 1, `;}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`);
        }
        else if (!depBlock.arrayRange && depBlock.functionRange) {
            source.replace(depBlock.outerRange[0], depBlock.functionRange[0] - 1, `${wrapper[0]}function() {(`);
            source.replace(depBlock.functionRange[1], depBlock.outerRange[1] - 1, `.call(exports, __webpack_require__, exports, module));}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`);
        }
        else if (depBlock.arrayRange && depBlock.functionRange && depBlock.errorCallbackRange) {
            source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, `${wrapper[0]}function() \{ `);
            source.insert(depBlock.arrayRange[0] + 0.9, 'var __WEBPACK_AMD_REQUIRE_ARRAY__ = ');
            source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, '; (');
            source.insert(depBlock.functionRange[1], '.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));');
            source.replace(depBlock.functionRange[1], depBlock.errorCallbackRange[0] - 1,
                `}${depBlock.functionBindThis ? '.bind(this)' : ''}${wrapper[1]}`);
            source.replace(depBlock.errorCallbackRange[1], depBlock.outerRange[1] - 1,
                (depBlock.errorCallbackBindThis ? '.bind(this)' : '') + wrapper[2]);
        }
        else if (depBlock.arrayRange && depBlock.functionRange) {
            source.replace(depBlock.outerRange[0], depBlock.arrayRange[0] - 1, `${wrapper[0]}function() { `);
            source.insert(depBlock.arrayRange[0] + 0.9, 'var __WEBPACK_AMD_REQUIRE_ARRAY__ = ');
            source.replace(depBlock.arrayRange[1], depBlock.functionRange[0] - 1, '; (');
            source.insert(depBlock.functionRange[1], '.apply(null, __WEBPACK_AMD_REQUIRE_ARRAY__));');
            source.replace(
                depBlock.functionRange[1],
                depBlock.outerRange[1] - 1,
                `}${depBlock.functionBindThis ? '.bind(this)' : ''}${wrapper[1]}__webpack_require__.oe${wrapper[2]}`
            );
        }
    }
}

class AMDRequireDependency extends NullDependency {
    constructor(public block: AMDRequireDependenciesBlock) {
        super();
    }

    static Template = Template
}

export = AMDRequireDependency;