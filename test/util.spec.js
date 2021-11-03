/* eslint-env mocha */

'use strict';

const util                = require('../util');
const { createVinylFile } = require('./test-util');
const assert              = require('assert');
const { resolve }         = require('path');
const stream              = require('stream');

require('mocha');

describe('utility methods', () => {
	describe('transform', () => {

		it('should handle files in a stream', done => {
			let passedFile = false;
			const streamFile = createVinylFile('invalid.js', 'x = 1;');
			const testStream = util.transform((file, enc, cb) => {
				assert(file);
				assert(cb);
				passedFile = (streamFile === file);
				cb();
			})
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(passedFile, true);
					done();
				});

			testStream.end(streamFile);
		});

		it('should flush when stream is ending', done => {
			let count = 0;
			let finalCount = 0;
			const files = [
				createVinylFile('invalid.js', 'x = 1;'),
				createVinylFile('undeclared.js', 'x = 0;')
			];
			const testStream = util.transform((file, enc, cb) => {
				assert(file);
				assert(cb);
				count += 1;
				cb();
			}, cb => {
				assert(cb);
				assert.strictEqual(count, files.length);
				assert.strictEqual(testStream._writableState.ending, true);
				finalCount = count;
				cb();
			})
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(finalCount, files.length);
					done();
				});

			files.forEach(file => testStream.write(file));

			testStream.end();

		});

	});

	describe('createIgnoreResult should create a warning', () => {

		function test(filePath, baseDir, expectedMessage) {
			const result = util.createIgnoreResult(filePath, baseDir);
			assert(result);
			assert.strictEqual(result.filePath, filePath);
			assert.strictEqual(result.errorCount, 0);
			assert.strictEqual(result.warningCount, 1);
			assert.strictEqual(result.fixableErrorCount, 0);
			assert.strictEqual(result.fixableWarningCount, 0);
			assert(Array.isArray(result.messages));
			assert.deepStrictEqual(
				result.messages,
				[{ fatal: false, severity: 1, message: expectedMessage }]
			);
		}

		it('for a hidden file', () => {
			test(
				resolve('.hidden.js'),
				process.cwd(),
				'File ignored by default. Use a negated ignore pattern (like '
				+ '"!<relative/path/to/filename>") to override.'
			);
		});

		it('for a file in a hidden folder', () => {
			test(
				resolve('.hidden/file.js'),
				process.cwd(),
				'File ignored by default. Use a negated ignore pattern (like '
				+ '"!<relative/path/to/filename>") to override.'
			);
		});

		it('for a file outside the base directory', () => {
			test(
				resolve('../file.js'),
				process.cwd(),
				'File ignored because of a matching ignore pattern. Set "ignore" option to false '
				+ 'to override.'
			);
		});

		it('for a path that includes "node_modules"', () => {
			test(
				resolve('node_modules/test/index.js'),
				process.cwd(),
				'File ignored by default. Use a negated ignore pattern like "!node_modules/*" to '
				+ 'override.'
			);
		});

		it('for a path that includes "node_modules" in the base directory', () => {
			test(
				resolve('node_modules/file.js'),
				resolve('node_modules'),
				'File ignored because of a matching ignore pattern. Set "ignore" option to false '
				+ 'to override.'
			);
		});

		it('for a path with a part that starts with "node_modules"', () => {
			test(
				resolve('node_modules_bak/file.js'),
				process.cwd(),
				'File ignored because of a matching ignore pattern. Set "ignore" option to false '
				+ 'to override.'
			);
		});

		it('for a file ignored by ".eslintignore"', () => {
			test(
				resolve('ignored.js'),
				process.cwd(),
				'File ignored because of a matching ignore pattern. Set "ignore" option to false '
				+ 'to override.'
			);
		});

	});

	describe('migrateOptions', () => {

		it('should migrate a string config value to "overrideConfigFile"', () => {
			const { eslintOptions } = util.migrateOptions('Config/Path');
			assert.deepStrictEqual(eslintOptions, { overrideConfigFile: 'Config/Path' });
		});

		it('should migrate "configFile" to "overrideConfigFile"', () => {
			const { eslintOptions } = util.migrateOptions({ configFile: 'Config/Path' });
			assert.deepStrictEqual(
				eslintOptions,
				{ overrideConfig: { }, overrideConfigFile: 'Config/Path' }
			);
		});

		it('should migrate an "envs" array to an "env" object', () => {
			const { eslintOptions }
			= util.migrateOptions({ envs: ['foo:true', 'bar:false', 'baz'] });
			assert.deepStrictEqual(
				eslintOptions,
				{ overrideConfig: { env: { foo: true, bar: false, baz: true } } }
			);
		});

		it('should migrate a "globals" array to an object', () => {
			const { eslintOptions }
			= util.migrateOptions({ globals: ['foo:true', 'bar:false', 'baz'] });
			assert.deepStrictEqual(
				eslintOptions,
				{ overrideConfig: { globals: { foo: true, bar: false, baz: false } } }
			);
		});

		it('should migrate a "plugins" arrays', () => {
			const { eslintOptions } = util.migrateOptions({ plugins: ['foo', 'bar'] });
			assert.deepStrictEqual(
				eslintOptions,
				{ overrideConfig: { plugins: ['foo', 'bar'] } }
			);
		});

		it('should not migrate a "plugins" object', () => {
			const { eslintOptions } = util.migrateOptions({ plugins: { foo: 'bar' } });
			assert.deepStrictEqual(
				eslintOptions,
				{ overrideConfig: { }, plugins: { foo: 'bar' } }
			);
		});

		it('should fail if a forbidden option is specified', () => {
			const options = {
				cache:                   true,
				cacheFile:               '\0',
				cacheLocation:           '\0',
				cacheStrategy:           'metadata',
				errorOnUnmatchedPattern: true,
				extensions:              [],
				globInputPaths:          false
			};
			assert.throws(
				() => util.migrateOptions(options),
				({ code, message }) =>
					code === 'ESLINT_INVALID_OPTIONS'
					&& message.includes(Object.keys(options).join(', '))
			);
		});

		it('should fail if "overrideConfig" is not an object or null', () => {
			assert.throws(
				() => util.migrateOptions({ overrideConfig: 'foo' }),
				({ code, message }) =>
					code === 'ESLINT_INVALID_OPTIONS' && /\boverrideConfig\b/.test(message)
			);
		});

		it('should fail if "envs" is not an array or falsy', () => {
			assert.throws(
				() => util.migrateOptions({ envs: 'foo' }),
				({ code, message }) =>
					code === 'ESLINT_INVALID_OPTIONS' && /\benvs\b/.test(message)
			);
		});

		it('should fail if "globals" is not an array or falsy', () => {
			assert.throws(
				() => util.migrateOptions({ globals: { } }),
				({ code, message }) =>
					code === 'ESLINT_INVALID_OPTIONS' && /\bglobals\b/.test(message)

			);
		});

		it('should not modify an existing overrideConfig', () => {
			const options = { overrideConfig: { }, parser: 'foo' };
			util.migrateOptions(options);
			assert.deepStrictEqual(options.overrideConfig, { });
		});

	});

	describe('isErrorMessage', () => {

		it('should determine severity a "fatal" message flag', () => {
			const errorMessage = {
				fatal: true,
				severity: 0
			};
			const isError = util.isErrorMessage(errorMessage);
			assert.strictEqual(isError, true);

		});

		it('should determine severity from an config array', () => {
			const errorMessage = {
				severity: [2, 1]
			};
			const isError = util.isErrorMessage(errorMessage);
			assert.strictEqual(isError, true);

		});

	});

	describe('filterResult', () => {

		const result = {
			filePath: 'invalid.js',
			messages: [{
				ruleId: 'error',
				severity: 2,
				message: 'This is an error.',
				line: 1,
				column: 1,
				nodeType: 'FunctionDeclaration',
				source: 'function a() { x = 0; }'
			}, {
				ruleId: 'warning',
				severity: 1,
				message: 'This is a warning.',
				line: 1,
				column: 1,
				nodeType: 'FunctionDeclaration',
				source: 'function a() { x = 0; }'
			}],
			errorCount: 1,
			warningCount: 1,
			output: 'function a () { x = 0; }'
		};

		it('should filter messages', () => {
			function warningsOnly(message) {
				return message.severity === 1;
			}
			const quietResult = util.filterResult(result, warningsOnly);
			assert.strictEqual(quietResult.filePath, 'invalid.js');
			assert(Array.isArray(quietResult.messages));
			assert.strictEqual(quietResult.messages.length, 1);
			assert.strictEqual(quietResult.errorCount, 0);
			assert.strictEqual(quietResult.warningCount, 1);
			assert.strictEqual(quietResult.output, 'function a () { x = 0; }');
		});

		it('should remove warning messages', () => {
			const quietResult = util.filterResult(result, true);
			assert.strictEqual(quietResult.filePath, 'invalid.js');
			assert(Array.isArray(quietResult.messages));
			assert.strictEqual(quietResult.messages.length, 1);
			assert.strictEqual(quietResult.errorCount, 1);
			assert.strictEqual(quietResult.warningCount, 0);
			assert.strictEqual(quietResult.output, 'function a () { x = 0; }');
		});

	});

	describe('resolveFormatter', () => {

		it('should default to the "stylish" formatter', () => {

			const formatter = util.resolveFormatter();
			const formatterPath
			= resolve(require.resolve('eslint'), '../cli-engine/formatters/stylish');
			assert.strictEqual(formatter, require(formatterPath));

		});

		it('should resolve a predefined', () => {

			const formatter = util.resolveFormatter('tap');
			const formatterPath
			= resolve(require.resolve('eslint'), '../cli-engine/formatters/tap');
			assert.strictEqual(formatter, require(formatterPath));

		});

		it('should resolve a custom formatter', () => {

			const formatter = util.resolveFormatter('test/custom-formatter');
			const formatterPath = resolve('./test/custom-formatter');
			assert.strictEqual(formatter, require(formatterPath));

		});

		it('should throw an error if a formatter cannot be resolved', () => {

			function resolveMissingFormatter() {
				util.resolveFormatter('missing-formatter');
			}
			assert.throws(resolveMissingFormatter, /\bThere was a problem loading formatter\b/);

		});

	});

	describe('resolveWritable', () => {

		it('should default to fancyLog', () => {

			const write = util.resolveWritable();
			assert.strictEqual(write, require('fancy-log'));

		});

		it('should write to a (writable) stream', function (done) {

			let written = false;
			const writable = new stream.Writable({ objectMode: true });
			const testValue = 'Formatted Output';
			const write = util.resolveWritable(writable);

			writable._write = function writeChunk(chunk, encoding, cb) {
				assert(chunk);
				assert.strictEqual(chunk, testValue);
				written = true;
				cb();
			};

			writable
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(written, true);
					done();
				});
			write(testValue);
			writable.end();

		});

	});

	describe('writeResults', () => {

		const testConfig = {},
			testResult = {
				config: testConfig
			},
			testResults = [testResult];

		it('should pass the value returned from the formatter to the writer', () => {

			const testValue = {};

			function testFormatter(results, config) {
				assert(results);
				assert.strictEqual(results, testResults);
				assert(config);
				assert.strictEqual(config, testConfig);

				return testValue;
			}

			function testWriter(value) {
				assert(value);
				assert.strictEqual(value, testValue);
			}

			util.writeResults(testResults, testFormatter, testWriter);

		});

		it('should not write an empty or missing value', () => {

			function testFormatter(results, config) {
				assert(results);
				assert.strictEqual(results, testResults);
				assert(config);
				assert.strictEqual(config, testConfig);

				return '';
			}

			function testWriter(value) {
				assert(!value);
			}

			util.writeResults(testResults, testFormatter, testWriter);

		});

		it('should default undefined results to an empty array', () => {

			function testFormatter(results, config) {
				assert(results);
				assert(Array.isArray(results));
				assert.strictEqual(results.length, 0);
				assert(config);

				return results.length + ' results';
			}

			function testWriter(value) {
				assert(value);
				assert.strictEqual(value, '0 results');
			}

			util.writeResults(null, testFormatter, testWriter);

		});

	});

});
