/* eslint-env mocha */

'use strict';

const eslint              = require('..');
const { createVinylFile } = require('./test-util');
const assert              = require('assert');
const { PassThrough }     = require('stream');

require('mocha');

describe('gulp-eslint-new result', () => {
	it('should provide an ESLint result', done => {
		let resultCount = 0;
		const lintStream = eslint({
			useEslintrc: false,
			rules: {
				'no-undef': 2,
				'strict': [1, 'global']
			}
		});

		lintStream
			.pipe(eslint.result(result => {
				assert(result);
				assert(Array.isArray(result.messages));
				assert.strictEqual(result.messages.length, 2);
				assert.strictEqual(result.errorCount, 1);
				assert.strictEqual(result.warningCount, 1);
				resultCount++;
			}))
			.on('finish', () => {
				assert.strictEqual(resultCount, 3);
				done();
			});

		lintStream.write(createVinylFile('invalid-1.js', 'x = 1;'));

		lintStream.write(createVinylFile('invalid-2.js', 'x = 2;'));

		lintStream.write(createVinylFile('invalid-3.js', 'x = 3;'));

		lintStream.end();
	});

	it('should catch thrown errors', done => {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = {};

		function finished() {
			done(new Error('Unexpected Finish'));
		}

		eslint.result(() => {
			throw new Error('Expected Error');
		})
			.on('error', function (error) {
				this.removeListener('finish', finished);
				assert(error);
				assert.strictEqual(error.message, 'Expected Error');
				assert.strictEqual(error.name, 'Error');
				assert.strictEqual(error.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', finished)
			.end(file);
	});

	it('should catch thrown null', done => {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = {};

		function finished() {
			done(new Error('Unexpected Finish'));
		}

		eslint.result(() => {
			throw null;
		})
			.on('error', function (error) {
				this.removeListener('finish', finished);
				assert(error);
				assert.strictEqual(error.message, 'Unknown Error');
				assert.strictEqual(error.name, 'Error');
				assert.strictEqual(error.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', finished)
			.end(file);
	});

	it('should throw an error if not provided a function argument', () => {

		try {
			eslint.result();
		} catch (error) {
			assert(error);
			assert(error.message);
			assert.strictEqual(error.message, 'Expected callable argument');
			return;
		}

		throw new Error('Expected exception to be thrown');

	});

	it('should ignore files without an ESLint result', done => {

		const file = createVinylFile('invalid.js', '#invalid!syntax}');

		eslint.result(() => {
			throw new Error('Expected no call');
		})
			.on('error', function (error) {
				this.removeListener('finish', done);
				done(error);
			})
			.on('finish', done)
			.end(file);
	});

	it('should support an async result handler', done => {
		let asyncComplete = false;
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		const resultStub = {};
		file.eslint = resultStub;

		function ended() {
			assert.strictEqual(asyncComplete, true);
			done();
		}

		const resultStream = eslint.result((result, callback) => {
			assert(result);
			assert.strictEqual(result, resultStub);

			assert.strictEqual(typeof callback, 'function');

			setTimeout(() => {
				asyncComplete = true;
				callback();
			}, 10);
		})
			.on('error', function (error) {
				this.removeListener('end', ended);
				done(error);
			})
			.on('end', ended);

		// drain result into pass-through stream
		resultStream.pipe(new PassThrough({ objectMode: true }));

		resultStream.end(file);

	});

});

describe('gulp-eslint-new results', () => {

	it('should provide ESLint results', done => {
		let resultsCalled = false;
		const lintStream = eslint({
			useEslintrc: false,
			rules: {
				'no-undef': 2,
				'strict': [1, 'global']
			}
		});

		lintStream
			.pipe(eslint.results(results => {
				assert(Array.isArray(results));
				assert.strictEqual(results.length, 3);
				assert.strictEqual(results.errorCount, 3);
				assert.strictEqual(results.warningCount, 3);
				resultsCalled = true;
			}))
			.on('finish', () => {
				assert.strictEqual(resultsCalled, true);
				done();
			});

		lintStream.write(createVinylFile('invalid-1.js', 'x = 1;'));

		lintStream.write(createVinylFile('invalid-2.js', 'x = 2;'));

		lintStream.write(createVinylFile('invalid-3.js', 'x = 3;'));

		lintStream.end();
	});

	it('should catch thrown errors', done => {
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		file.eslint = {};

		function finished() {
			done(new Error('Unexpected Finish'));
		}

		eslint.results(() => {
			throw new Error('Expected Error');
		})
			.on('error', function (error) {
				this.removeListener('finish', finished);
				assert(error);
				assert.strictEqual(error.message, 'Expected Error');
				assert.strictEqual(error.name, 'Error');
				assert.strictEqual(error.plugin, 'gulp-eslint-new');
				done();
			})
			.on('finish', finished)
			.end(file);
	});

	it('should throw an error if not provided a function argument', () => {

		try {
			eslint.results();
		} catch (error) {
			assert(error);
			assert(error.message);
			assert.strictEqual(error.message, 'Expected callable argument');
			return;
		}

		throw new Error('Expected exception to be thrown');

	});

	it('should ignore files without an ESLint result', done => {
		let resultsCalled = false;
		const file = createVinylFile('invalid.js', '#invalid!syntax}');

		function finished() {
			assert.strictEqual(resultsCalled, true);
			done();
		}

		eslint.results(results => {
			assert(Array.isArray(results));
			assert.strictEqual(results.length, 0);
			resultsCalled = true;
		})
			.on('error', function (error) {
				this.removeListener('finish', finished);
				done(error);
			})
			.on('finish', finished)
			.end(file);
	});

	it('should support an async results handler', done => {
		let asyncComplete = false;
		const file = createVinylFile('invalid.js', '#invalid!syntax}');
		const resultStub = {};
		file.eslint = resultStub;

		function ended() {
			assert.strictEqual(asyncComplete, true);
			done();
		}

		const resultStream = eslint.results((results, callback) => {
			assert(Array.isArray(results));
			assert.strictEqual(results.length, 1);

			const result = results[0];
			assert.strictEqual(result, resultStub);

			assert.strictEqual(typeof callback, 'function');

			setTimeout(() => {
				asyncComplete = true;
				callback();
			}, 10);
		})
			.on('error', function (error) {
				this.removeListener('end', ended);
				done(error);
			})
			.on('end', ended);

		// drain result into pass-through stream
		resultStream.pipe(new PassThrough({ objectMode: true }));

		resultStream.end(file);

	});

});
