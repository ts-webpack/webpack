/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import AsyncDependenciesBlock = require('../AsyncDependenciesBlock');
import ImportDependency = require('./ImportDependency');
import { SourceLocation } from 'estree'
import { SourceRange } from '../../typings/webpack-types'
import Module = require('../Module')

class ImportDependenciesBlock extends AsyncDependenciesBlock {
    constructor(request: string, public range: SourceRange, chunkName: string, module: Module, loc: SourceLocation) {
        super(chunkName, module, loc);
        const dep = new ImportDependency(request, this);
        dep.loc = loc;
        this.addDependency(dep);
    }
}

export = ImportDependenciesBlock;
