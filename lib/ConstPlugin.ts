/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import ConstDependency = require('./dependencies/ConstDependency');
import BasicEvaluatedExpression = require('./BasicEvaluatedExpression');
import NullFactory = require('./NullFactory');
import Compiler = require('./Compiler')
import Compilation = require('./Compilation')
import { CompilationParams } from '../typings/webpack-types'
import { IfStatement, ConditionalExpression, Identifier } from 'estree'
import Parser = require('./Parser')

function getQuery(request: string) {
    const i = request.indexOf('?');
    return i < 0 ? '' : request.substr(i);
}

class ConstPlugin {
    apply(compiler: Compiler) {
        compiler.plugin('compilation', function (compilation: Compilation, params: CompilationParams) {
            compilation.dependencyFactories.set(ConstDependency, new NullFactory());
            compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

            params.normalModuleFactory.plugin('parser', function (parser: Parser) {
                parser.plugin('statement if', function (statement: IfStatement) {
                    const param = this.evaluateExpression(statement.test);
                    const bool = param.asBool();
                    if (typeof bool === 'boolean') {
                        if (statement.test.type !== 'Literal') {
                            const dep = new ConstDependency(`${bool}`, param.range);
                            dep.loc = statement.loc;
                            this.state.current.addDependency(dep);
                        }
                        return bool;
                    }
                });
                parser.plugin('expression ?:', function (expression: ConditionalExpression) {
                    const param = this.evaluateExpression(expression.test);
                    const bool = param.asBool();
                    if (typeof bool === 'boolean') {
                        if (expression.test.type !== 'Literal') {
                            const dep = new ConstDependency(` ${bool}`, param.range);
                            dep.loc = expression.loc;
                            this.state.current.addDependency(dep);
                        }
                        return bool;
                    }
                });
                parser.plugin('evaluate Identifier __resourceQuery', function (expr: Identifier) {
                    if (!this.state.module) {
                        return;
                    }
                    const res = new BasicEvaluatedExpression();
                    res.setString(getQuery(this.state.module.resource));
                    res.setRange(expr.range);
                    return res;
                });
                parser.plugin('expression __resourceQuery', function () {
                    if (!this.state.module) {
                        return;
                    }
                    this.state.current.addVariable('__resourceQuery', JSON.stringify(getQuery(this.state.module.resource)));
                    return true;
                });
            });
        });
    }
}

export = ConstPlugin;
