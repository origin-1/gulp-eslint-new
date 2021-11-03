/* eslint-env mocha */

'use strict';

const eslint              = require('..');
const { createVinylFile } = require('./test-util');
const assert              = require('assert');
const path                = require('path');

require('mocha');

describe('gulp-eslint-new failOnError', () =>  {
	it('should fail a file immediately if an error is found', done =>  {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });

		function endWithoutError() {
			done(new Error('An error was not thrown before ending'));
		}

		lintStream.pipe(eslint.failOnError())
			.on('error', function (err)  {
				this.removeListener('finish', endWithoutError);
				assert(err);
				assert.strictEqual(err.message, '\'x\' is not defined.');
				assert.strictEqual(err.fileName, path.resolve('invalid.js'));
				assert.strictEqual(err.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', endWithoutError);

		lintStream.write(createVinylFile('invalid.js', 'x = 1;'));

		lintStream.end();
	});

	it('should pass a file if only warnings are found', done =>  {

		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 1, 'strict': 0 } });

		lintStream.pipe(eslint.failOnError())
			.on('error', done)
			.on('finish', done);

		lintStream.end(createVinylFile('invalid.js', 'x = 0;'));
	});

	it('should handle ESLint reports without messages', done =>  {

		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = {};

		eslint.failOnError()
			.on('error', err =>  {
				this.removeListener('finish', done);
				done(err);
			})
			.on('finish', done)
			.end(file);
	});

});

describe('gulp-eslint-new failAfterError', () =>  {

	it('should fail when the file stream ends if an error is found', done =>  {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });

		function endWithoutError() {
			done(new Error('An error was not thrown before ending'));
		}

		lintStream.pipe(eslint.failAfterError())
			.on('error', function (err)  {
				this.removeListener('finish', endWithoutError);
				assert(err);
				assert.strictEqual(err.message, 'Failed with 1 error');
				assert.strictEqual(err.name, 'ESLintError');
				assert.strictEqual(err.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', endWithoutError);

		lintStream.end(createVinylFile('invalid.js', 'x = 1;'));
	});

	it('should fail when the file stream ends if multiple errors are found', done =>  {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 2 } });

		lintStream.pipe(eslint.failAfterError().on('error', err =>  {
			assert(err);
			assert.strictEqual(err.message, 'Failed with 2 errors');
			assert.strictEqual(err.name, 'ESLintError');
			assert.strictEqual(err.plugin, 'gulp-eslint-new');
			done();
		}));

		lintStream.end(createVinylFile('invalid.js', 'x = 1; a = false;'));
	});

	it('should pass when the file stream ends if only warnings are found', done =>  {
		const lintStream = eslint({ useEslintrc: false, rules: { 'no-undef': 1, strict: 0 } });

		lintStream.pipe(eslint.failAfterError())
			.on('error', done)
			.on('finish', done);

		lintStream.end(createVinylFile('invalid.js', 'x = 0;'));
	});

	it('should handle ESLint reports without messages', done =>  {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = {};

		eslint.failAfterError()
			.on('error', done)
			.on('finish', done)
			.end(file);
	});

});