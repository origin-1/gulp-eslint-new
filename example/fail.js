'use strict';

// npm install fancy-log gulp gulp-eslint-new

const fancyLog = require('fancy-log');
const { src }  = require('gulp');
const eslint   = require('gulp-eslint-new');

function failImmediately() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint())
		// Format one at time since this stream may fail before it can format them all at the end.
		.pipe(eslint.formatEach())
		// failOnError will emit an error (fail) immediately upon the first file that has an error.
		.pipe(eslint.failOnError())
		// need to do something before the process exits? Try this:
		.on('error', error => {
			fancyLog(`Stream Exiting With Error: ${error.message}`);
		});
}

function failAtEnd() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint())
		// Format all results at once, at the end.
		.pipe(eslint.format())
		// failAfterError will emit an error (fail) just before the stream finishes if any file has
		// an error.
		.pipe(eslint.failAfterError());
}

module.exports = {
	'default': failImmediately,
	'fail-immediately': failImmediately,
	'fail-at-end': failAtEnd
};
