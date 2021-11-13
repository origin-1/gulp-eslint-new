'use strict';

const { resolve }   = require('path');
const { finished }  = require('stream');
const { promisify } = require('util');
const File          = require('vinyl');

exports.createVinylFile = (path, contents) => {
	const file = new File({ path: resolve(path), contents: Buffer.from(contents) });
	return file;
};

exports.finished = promisify(finished);

exports.noop = () => { };
