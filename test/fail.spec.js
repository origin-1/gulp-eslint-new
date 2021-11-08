/* eslint-env mocha */

'use strict';

const { createVinylFile, endWithoutError } = require('./test-util');
const { strict: assert }                   = require('assert');
const eslint                               = require('gulp-eslint-new');
const { resolve }                          = require('path');

describe('gulp-eslint-new failOnError', () => {

	it('should fail a file immediately if an error is found', done => {
		const file = createVinylFile('invalid.js', 'x = 1;');
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });
		lintStream
			.pipe(eslint.failOnError())
			.on('error', function (err) {
				this.off('finish', this._events.finish);
				assert(err.fileName, file.path);
				assert.equal(err.message, '\'x\' is not defined.');
				assert.equal(err.fileName, resolve('invalid.js'));
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', endWithoutError(done));
		lintStream.end(file);
	});

	it('should pass a file if only warnings are found', done => {
		eslint({ useEslintrc: false, rules: { 'no-undef': 1, 'strict': 0 } })
			.pipe(eslint.failOnError())
			.on('error', done)
			.on('finish', done)
			.end(createVinylFile('invalid.js', 'x = 0;'));
	});

	it('should handle ESLint reports without messages', done => {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = { };
		eslint.failOnError()
			.on('error', done)
			.on('finish', done)
			.end(file);
	});

});

describe('gulp-eslint-new failAfterError', () => {

	it('should emit an error if ESLint finds an error in a file', done => {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });
		lintStream
			.pipe(eslint.failAfterError())
			.on('error', function (err) {
				this.off('finish', this._events.finish);
				assert.equal(err.message, 'Failed with 1 error');
				assert.equal(err.name, 'ESLintError');
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', endWithoutError(done));
		lintStream.end(createVinylFile('invalid.js', 'x = 1;'));
	});

	it('should emit an error if ESLint finds multiple errors in a file', done => {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });
		lintStream
			.pipe(eslint.failAfterError())
			.on('error', function (err) {
				this.off('finish', this._events.finish);
				assert.equal(err.message, 'Failed with 2 errors');
				assert.equal(err.name, 'ESLintError');
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', endWithoutError(done));
		lintStream.end(createVinylFile('invalid.js', 'x = 1; a = false;'));
	});

	it('should pass when the file stream ends if only warnings are found', done => {
		eslint({ useEslintrc: false, rules: { 'no-undef': 1, strict: 0 } })
			.pipe(eslint.failAfterError())
			.on('error', done)
			.on('finish', done)
			.end(createVinylFile('invalid.js', 'x = 0;'));
	});

	it('should handle ESLint reports without messages', done => {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = { };
		eslint.failAfterError()
			.on('error', done)
			.on('finish', done)
			.end(file);
	});

});
