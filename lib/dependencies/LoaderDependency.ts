/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ModuleDependency = require('./ModuleDependency');

class LoaderDependency extends ModuleDependency {
    constructor(request) {
        super(request);
    }
}

LoaderDependency.prototype.type = 'loader';

export = LoaderDependency;
