/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Compiler = require('../Compiler')
import Compilation = require('../Compilation')
import Chunk = require('../Chunk')

class MinChunkSizePlugin {
    constructor(
        public options: {
            minChunkSize: number
        }
    ) {
        if (typeof options !== 'object' || Array.isArray(options)) {
            throw new Error('Argument should be an options object.\nFor more info on options, see https://webpack.github.io/docs/list-of-plugins.html');
        }
    }

    apply(compiler: Compiler) {
        const options = this.options;
        const minChunkSize = options.minChunkSize;
        compiler.plugin('compilation', function (compilation: Compilation) {
            compilation.plugin('optimize-chunks-advanced', function (chunks: Chunk[]) {

                // todo: the form of combinations is too flexible, unable to attach a type system
                let combinations = [];
                chunks.forEach((a, idx) => {
                    for (let i = 0; i < idx; i++) {
                        const b = chunks[i];
                        combinations.push([b, a]);
                    }
                });

                const equalOptions = {
                    chunkOverhead: 1,
                    entryChunkMultiplicator: 1
                };
                combinations = combinations.filter(
                    pair => pair[0].size(equalOptions) < minChunkSize || pair[1].size(equalOptions) < minChunkSize);

                combinations.forEach(pair => {
                    const a = pair[0].size(options);
                    const b = pair[1].size(options);
                    const ab = pair[0].integratedSize(pair[1], options);
                    pair.unshift(a + b - ab, ab);
                });

                combinations = combinations.filter(pair => pair[1] !== false);

                if (combinations.length === 0) {
                    return;
                }

                combinations.sort((a, b) => {
                    const diff = b[0] - a[0];
                    if (diff !== 0) {
                        return diff;
                    }
                    return a[1] - b[1];
                });

                const pair = combinations[0];

                pair[2].integrate(pair[3], 'min-size');
                chunks.splice(chunks.indexOf(pair[3]), 1);
                return true;
            });
        });
    }
}

export = MinChunkSizePlugin;