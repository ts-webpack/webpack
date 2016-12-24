/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class CriticalDependencyWarning extends Error {
    constructor(message: string) {
        super();
        Error.captureStackTrace(this, CriticalDependencyWarning);
        this.name = 'CriticalDependencyWarning';
        this.message = `Critical dependency: ${message}`;
    }
}

export = CriticalDependencyWarning;