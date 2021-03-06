/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Jarid Margolin @jaridmargolin
 */
'use strict';

class WebpackError extends Error {
    inspect() {
        return this.stack + (this.details ? `\n${ this.details }` : '');
    }
}

export = WebpackError
