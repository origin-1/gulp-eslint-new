'use strict';

const { resolve }   = require('path');
const { finished }  = require('stream');
const { promisify } = require('util');
const File          = require('vinyl');

exports.createVinylDirectory = () => {
    const directory = new File({
        path: process.cwd(),
        contents: null,
        isDirectory: true
    });
    return directory;
};

exports.createVinylFile = (path, contents) => {
    const file = new File({ path: resolve(path), contents: Buffer.from(contents) });
    return file;
};

exports.finished = promisify(finished);

exports.noop = () => { };
