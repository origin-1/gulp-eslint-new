'use strict';

const { resolve } = require('path');
const File        = require('vinyl');

function createVinylFile(path, contents) {
	const file = new File({ path: resolve(path), contents: Buffer.from(contents) });
	return file;
}

exports.createVinylFile = createVinylFile;
