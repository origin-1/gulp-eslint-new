/* global describe, it, afterEach */
'use strict';

const assert = require('assert');
const File = require('vinyl');
const stream = require('stream');
const util = require('../util');
const path = require('path');

require('mocha');

describe('utility methods', () => {
	describe('transform', () => {

		it('should handle files in a stream', done => {
			let passedFile = false;
			const streamFile = new File({
				path: 'test/fixtures/invalid.js',
				contents: Buffer.from('x = 1;')
			});
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
				new File({
					path: 'test/fixtures/invalid.js',
					contents: Buffer.from('x = 1;')
				}),
				new File({
					path: 'test/fixtures/undeclared.js',
					contents: Buffer.from('x = 0;')
				})
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

	describe('createIgnoreResult', () => {

		it('should create a warning that the file is ignored by ".eslintignore"', () => {
			const file = new File({
				path: 'test/fixtures/ignored.js',
				contents: Buffer.from('')
			});
			const result = util.createIgnoreResult(file);
			assert(result);
			assert.strictEqual(result.filePath, file.path);
			assert.strictEqual(result.errorCount, 0);
			assert.strictEqual(result.warningCount, 1);
			assert(Array.isArray(result.messages));
			assert.strictEqual(result.messages.length, 1);
			assert.strictEqual(
				result.messages[0].message,
				'File ignored because of .eslintignore file'
			);

		});

		it('should create a warning for paths that include "node_modules"', () => {
			const file = new File({
				path: 'node_modules/test/index.js',
				contents: Buffer.from('')
			});
			const result = util.createIgnoreResult(file);
			assert(result);
			assert.strictEqual(result.filePath, file.path);
			assert.strictEqual(result.errorCount, 0);
			assert.strictEqual(result.warningCount, 1);
			assert(Array.isArray(result.messages));
			assert.strictEqual(result.messages.length, 1);
			assert.strictEqual(
				result.messages[0].message,
				'File ignored because it has a node_modules/** path'
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

		it('should fail if "overrideConfig" is not an object or null', () => {
			assert.throws(
				() => util.migrateOptions({ overrideConfig: 'foo' }), /\overrideConfig\b/
			);
		});

		it('should fail if "envs" is not an array or falsy', () => {
			assert.throws(() => util.migrateOptions({ envs: 'foo' }), /\benvs\b/);
		});

		it('should fail if "globals" is not an array or falsy', () => {
			assert.throws(() => util.migrateOptions({ globals: { } }), /\globals\b/);
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
			filePath: 'test/fixtures/invalid.js',
			messages: [{
				ruleId: 'error',
				severity: 2,
				message: 'This is an error.',
				line: 1,
				column: 1,
				nodeType: 'FunctionDeclaration',
				source: 'function a() { x = 0; }'
			},{
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
			assert.strictEqual(quietResult.filePath, 'test/fixtures/invalid.js');
			assert(Array.isArray(quietResult.messages));
			assert.strictEqual(quietResult.messages.length, 1);
			assert.strictEqual(quietResult.errorCount, 0);
			assert.strictEqual(quietResult.warningCount, 1);
			assert.strictEqual(quietResult.output, 'function a () { x = 0; }');
		});

		it('should remove warning messages', () => {
			const quietResult = util.filterResult(result, true);
			assert.strictEqual(quietResult.filePath, 'test/fixtures/invalid.js');
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
			= path.resolve(require.resolve('eslint'), '../cli-engine/formatters/stylish');
			assert.strictEqual(formatter, require(formatterPath));

		});

		it('should resolve a predefined', () => {

			const formatter = util.resolveFormatter('tap');
			const formatterPath
			= path.resolve(require.resolve('eslint'), '../cli-engine/formatters/tap');
			assert.strictEqual(formatter, require(formatterPath));

		});

		it('should resolve a custom formatter', () => {

			const formatter = util.resolveFormatter('test/fixtures/custom-formatter');
			const formatterPath
			= path.resolve('./test/fixtures/custom-formatter');
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

		it('should write to a (writable) stream', function(done) {

			let written = false;
			const writable = new stream.Writable({objectMode: true});
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
