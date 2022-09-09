'use strict';

const { resolve }   = require('path');
const { finished }  = require('stream');
const { promisify } = require('util');
const File          = require('vinyl');

exports.createVinylDirectory =
() => {
    const directory = new File({ path: process.cwd(), contents: null, isDirectory: true });
    return directory;
};

exports.createVinylFile =
(path, contents) => {
    const file = new File({ path: resolve(path), contents: Buffer.from(contents) });
    return file;
};

exports.finished = promisify(finished);

// In some versions on Node.js, `assert.deepEqual(value, []);` does not throw an error if `value` is
// undefined.
// As a workaround, we will use `assert(isEmptyArray(value));`.
exports.isEmptyArray = value => Array.isArray(value) && value.length === 0;

exports.noop = () => { };
