/* eslint-env mocha */

'use strict';

const eslint              = require('..');
const { createVinylFile } = require('./test-util');
const { strict: assert }  = require('assert');
const { PassThrough }     = require('stream');

describe('gulp-eslint-new result', () => {
	it('should provide an ESLint result', done => {
		let resultCount = 0;
		const lintStream = eslint({
			useEslintrc: false,
			rules: {
				'camelcase': 1,         // not fixable
				'no-extra-parens': 1,   // fixable
				'no-undef': 2,          // not fixable
				'quotes': [2, 'single'] // fixable
			}
		});
		const testDataList = [
			{
				path:                'invalid-1.js',
				contents:            'x_1 = (""); x_2 = "";',
				errorCount:          4,
				warningCount:        3,
				fixableErrorCount:   2,
				fixableWarningCount: 1,
				fatalErrorCount:     0
			},
			{
				path:                'invalid-2.js',
				contents:            'x_1 = (""); x_2 = (0);',
				errorCount:          3,
				warningCount:        4,
				fixableErrorCount:   1,
				fixableWarningCount: 2,
				fatalErrorCount:     0
			},
			{
				path:                'invalid-3.js',
				contents:            '#@?!',
				errorCount:          1,
				warningCount:        0,
				fixableErrorCount:   0,
				fixableWarningCount: 0,
				fatalErrorCount:     1
			}
		];
		lintStream
			.pipe(eslint.result(result => {
				const testData = testDataList[resultCount];
				assert(result);
				assert(Array.isArray(result.messages));
				assert.equal(result.messages.length, testData.errorCount + testData.warningCount);
				assert.equal(result.errorCount, testData.errorCount);
				assert.equal(result.warningCount, testData.warningCount);
				assert.equal(result.fixableErrorCount, testData.fixableErrorCount);
				assert.equal(result.fixableWarningCount, testData.fixableWarningCount);
				assert.equal(result.fatalErrorCount, testData.fatalErrorCount);
				resultCount++;
			}))
			.on('finish', () => {
				assert.equal(resultCount, 3);
				done();
			});
		for (const { path, contents } of testDataList) {
			lintStream.write(createVinylFile(path, contents));
		}
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
				assert.equal(error.message, 'Expected Error');
				assert.equal(error.name, 'Error');
				assert.equal(error.plugin, 'gulp-eslint-new');
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
				assert.equal(error.message, 'Unknown Error');
				assert.equal(error.name, 'Error');
				assert.equal(error.plugin, 'gulp-eslint-new');
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
			assert.equal(error.message, 'Expected callable argument');
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
			assert.equal(asyncComplete, true);
			done();
		}

		const resultStream = eslint.result((result, callback) => {
			assert(result);
			assert.equal(result, resultStub);

			assert.equal(typeof callback, 'function');

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
				'camelcase': 1,         // not fixable
				'no-extra-parens': 1,   // fixable
				'no-undef': 2,          // not fixable
				'quotes': [2, 'single'] // fixable
			},
			warnIgnored: true
		});
		lintStream
			.pipe(eslint.results(results => {
				assert(Array.isArray(results));
				assert.equal(results.length, 4);
				assert.equal(results.errorCount, 5);
				assert.equal(results.warningCount, 4);
				assert.equal(results.fixableErrorCount, 3);
				assert.equal(results.fixableWarningCount, 2);
				assert.equal(results.fatalErrorCount, 1);
				resultsCalled = true;
			}))
			.on('finish', () => {
				assert.equal(resultsCalled, true);
				done();
			});
		lintStream.write(createVinylFile('invalid-1.js', '#@?!'));
		lintStream.write(createVinylFile('invalid-2.js', 'x_1 = ("" + "");'));
		lintStream.write(createVinylFile('invalid-3.js', 'var x = ("");'));
		lintStream.write(createVinylFile('node_modules/file.js', ''));
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
				assert.equal(error.message, 'Expected Error');
				assert.equal(error.name, 'Error');
				assert.equal(error.plugin, 'gulp-eslint-new');
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
			assert.equal(error.message, 'Expected callable argument');
			return;
		}

		throw new Error('Expected exception to be thrown');

	});

	it('should ignore files without an ESLint result', done => {
		let resultsCalled = false;
		const file = createVinylFile('invalid.js', '#invalid!syntax}');

		function finished() {
			assert.equal(resultsCalled, true);
			done();
		}

		eslint.results(results => {
			assert(Array.isArray(results));
			assert.equal(results.length, 0);
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
			assert.equal(asyncComplete, true);
			done();
		}

		const resultStream = eslint.results((results, callback) => {
			assert(Array.isArray(results));
			assert.equal(results.length, 1);

			const result = results[0];
			assert.equal(result, resultStub);

			assert.equal(typeof callback, 'function');

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
