/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import path = require('path');

class RequestShortener {
    buildinsAsModule: boolean
    buildinsRegExp: RegExp
    currentDirectoryRegExp: RegExp
    indexJsRegExp: RegExp
    nodeModulesRegExp: RegExp
    parentDirectoryRegExp: RegExp

    constructor(directory: string) {
        directory = directory.replace(/\\/g, '/');
        if (/[\/\\]$/.test(directory)) {
            directory = directory.substr(0, directory.length - 1);
        }

        if (directory) {
            const currentDirectoryRegExp = directory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            this.currentDirectoryRegExp = new RegExp(`^${currentDirectoryRegExp}|(!)${currentDirectoryRegExp}`, 'g');
        }

        const dirname = path.dirname(directory);
        const endsWithSeperator = /[\/\\]$/.test(dirname);
        const parentDirectory = endsWithSeperator ? dirname.substr(0, dirname.length - 1) : dirname;

        if (parentDirectory && parentDirectory !== directory) {
            const parentDirectoryRegExp = parentDirectory.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

            this.parentDirectoryRegExp = new RegExp(`^${parentDirectoryRegExp}|(!)${parentDirectoryRegExp}`, 'g');
        }

        if (__dirname.length >= 2) {
            const buildins = path.join(__dirname, '..').replace(/\\/g, '/');
            const buildinsAsModule = this.currentDirectoryRegExp && this.currentDirectoryRegExp.test(buildins);
            const buildinsRegExpStr = buildins.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

            this.buildinsAsModule = buildinsAsModule;
            this.buildinsRegExp = new RegExp(`^${buildinsRegExpStr}|(!)${buildinsRegExpStr}`, 'g');
        }

        this.nodeModulesRegExp = /\/node_modules\//g;
        this.indexJsRegExp = /\/index.js(!|\?|\(query\))/g;
    }

    shorten(request: string) {
        if (!request) {
            return request;
        }
        request = request.replace(/\\/g, '/');
        if (this.buildinsAsModule && this.buildinsRegExp) {
            request = request.replace(this.buildinsRegExp, '!(webpack)');
        }
        if (this.currentDirectoryRegExp) {
            request = request.replace(this.currentDirectoryRegExp, '!.');
        }
        if (this.parentDirectoryRegExp) {
            request = request.replace(this.parentDirectoryRegExp, '!..');
        }
        if (!this.buildinsAsModule && this.buildinsRegExp) {
            request = request.replace(this.buildinsRegExp, '!(webpack)');
        }
        request = request.replace(this.nodeModulesRegExp, '/~/');
        request = request.replace(this.indexJsRegExp, '$1');
        return request.replace(/^!|!$/, '');
    }
}

export = RequestShortener;
