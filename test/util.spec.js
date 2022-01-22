/* eslint-env mocha */

'use strict';

const util                                = require('../util');
const { createVinylFile, finished, noop } = require('./test-util');
const { strict: assert }                  = require('assert');
const { ESLint }                          = require('eslint');
const { resolve }                         = require('path');
const { Writable }                        = require('stream');

describe('utility methods', () => {

	describe('createTransform', () => {

		it('should handle files in a stream', async () => {
			let actualFile;
			let finishCalled = false;
			const expectedFile = createVinylFile('invalid.js', 'x = 1;');
			await finished(
				util
					.createTransform(
						file => {
							actualFile = file;
						}
					)
					.on('data', file => {
						assert.equal(file, expectedFile);
						actualFile = file;
					})
					.on('finish', () => {
						assert(actualFile);
						finishCalled = true;
					})
					.end(expectedFile)
			);
			assert(finishCalled);
		});

		it('should flush when stream is ending', async () => {
			let count = 0;
			let finalCount = 0;
			let finishCalled = false;
			const files = [
				createVinylFile('invalid.js', 'x = 1;'),
				createVinylFile('undeclared.js', 'x = 0;')
			];
			const testStream = util
				.createTransform(
					file => {
						assert(files.includes(file));
						count += 1;
					}, () => {
						assert.equal(count, files.length);
						assert.equal(testStream._writableState.ending, true);
						finalCount = count;
					}
				)
				.on('data', noop)
				.on('finish', () => {
					assert.equal(finalCount, files.length);
					finishCalled = true;
				});
			files.forEach(file => testStream.write(file));
			testStream.end();
			await finished(testStream);
			assert(finishCalled);
		});

		it('should catch errors in an asynchronous file handler', done => {
			util
				.createTransform(
					() => new Promise((_, reject) => {
						setImmediate(() => reject('foo'));
					})
				)
				.on('error', err => {
					assert(err.message, 'foo');
					assert(err.plugin, 'gulp-eslint-new');
					done();
				})
				.end(createVinylFile('file.js', ''));
		});

		it('should catch errors in an asynchronous flush handler', done => {
			util
				.createTransform(
					noop,
					() => new Promise((_, reject) => {
						setImmediate(reject('foo'));
					})
				)
				.on('error', err => {
					assert(err.message, 'foo');
					assert(err.plugin, 'gulp-eslint-new');
					done();
				})
				.end(createVinylFile('file.js', ''));
		});

	});

	describe('createIgnoreResult should create a warning', () => {

		function test(filePath, baseDir, expectedMessage) {
			const result = util.createIgnoreResult(filePath, baseDir);
			assert(result);
			assert.equal(result.filePath, filePath);
			assert.equal(result.errorCount, 0);
			assert.equal(result.warningCount, 1);
			assert.equal(result.fixableErrorCount, 0);
			assert.equal(result.fixableWarningCount, 0);
			assert.equal(result.fatalErrorCount, 0);
			assert(Array.isArray(result.messages));
			assert.deepEqual(
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
			assert.deepEqual(eslintOptions, { overrideConfigFile: 'Config/Path' });
		});

		it('should migrate "configFile" to "overrideConfigFile"', () => {
			const { eslintOptions } = util.migrateOptions({ configFile: 'Config/Path' });
			assert.deepEqual(
				eslintOptions,
				{ overrideConfig: { }, overrideConfigFile: 'Config/Path' }
			);
		});

		it('should migrate an "envs" array to an "env" object', () => {
			const { eslintOptions }
			= util.migrateOptions({ envs: ['foo:true', 'bar:false', 'baz'] });
			assert.deepEqual(
				eslintOptions,
				{ overrideConfig: { env: { foo: true, bar: false, baz: true } } }
			);
		});

		it('should migrate a "globals" array to an object', () => {
			const { eslintOptions }
			= util.migrateOptions({ globals: ['foo:true', 'bar:false', 'baz'] });
			assert.deepEqual(
				eslintOptions,
				{ overrideConfig: { globals: { foo: true, bar: false, baz: false } } }
			);
		});

		it('should migrate a "plugins" arrays', () => {
			const { eslintOptions } = util.migrateOptions({ plugins: ['foo', 'bar'] });
			assert.deepEqual(
				eslintOptions,
				{ overrideConfig: { plugins: ['foo', 'bar'] } }
			);
		});

		it('should not migrate a "plugins" object', () => {
			const { eslintOptions } = util.migrateOptions({ plugins: { foo: 'bar' } });
			assert.deepEqual(
				eslintOptions,
				{ overrideConfig: { }, plugins: { foo: 'bar' } }
			);
		});

		it('should treat "warnFileIgnored" as a synonym for "warnIgnored"', () => {
			const { warnIgnored } = util.migrateOptions({ warnFileIgnored: true });
			assert.equal(warnIgnored, true);
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
			assert.deepEqual(options.overrideConfig, { });
		});

	});

	describe('filterResult', () => {

		const result = {
			filePath: 'invalid.js',
			messages: [{
				ruleId: 'error',
				message: 'This is an error.',
				severity: 2
			}, {
				ruleId: 'warning',
				message: 'This is a warning.',
				severity: 1
			}, {
				ruleId: 'fixable error',
				message: 'This is a fixable error.',
				severity: 2,
				fix: { }
			}, {
				ruleId: 'fixable warning',
				message: 'This is a fixable warning.',
				severity: 1,
				fix: { }
			}, {
				ruleId: 'fatal error',
				message: 'This is a fatal error.',
				fatal: true,
				severity: 2
			}],
			errorCount: 3,
			warningCount: 2,
			fatalErrorCount: 1,
			output: 'function a () { x = 0; }'
		};

		it('should remove error messages', () => {
			const quietResult = util.filterResult(result, util.isWarningMessage);
			assert.equal(quietResult.filePath, 'invalid.js');
			assert(Array.isArray(quietResult.messages));
			assert.equal(quietResult.messages.length, 2);
			assert.equal(quietResult.errorCount, 0);
			assert.equal(quietResult.warningCount, 2);
			assert.equal(quietResult.fixableErrorCount, 0);
			assert.equal(quietResult.fixableWarningCount, 1);
			assert.equal(quietResult.fatalErrorCount, 0);
			assert.equal(quietResult.output, 'function a () { x = 0; }');
		});

		it('should remove warning messages', () => {
			const quietResult = util.filterResult(result, util.isErrorMessage);
			assert.equal(quietResult.filePath, 'invalid.js');
			assert(Array.isArray(quietResult.messages));
			assert.equal(quietResult.messages.length, 3);
			assert.equal(quietResult.errorCount, 3);
			assert.equal(quietResult.warningCount, 0);
			assert.equal(quietResult.fixableErrorCount, 1);
			assert.equal(quietResult.fixableWarningCount, 0);
			assert.equal(quietResult.fatalErrorCount, 1);
			assert.equal(quietResult.output, 'function a () { x = 0; }');
		});

	});

	describe('compareResultsByFilePath', () => {

		it('should return 1 if the first path goes after the second one', () => {
			assert.equal(
				util.compareResultsByFilePath(
					{ filePath: '/a/b/file.js' },
					{ filePath: '/a/b/FILE.js' }
				),
				1
			);
		});

		it('should return -1 if the first path goes before the second one', () => {
			assert.equal(
				util.compareResultsByFilePath({ filePath: 'C:' }, { filePath: 'D:' }),
				-1
			);
		});

		it('should return 0 if both paths are equal', () => {
			assert.equal(
				util.compareResultsByFilePath({ filePath: '' }, { filePath: '' }),
				0
			);
		});

	});

	describe('resolveFormatter', () => {

		const testResults = [
			{
				filePath: 'foo',
				messages: [{ column: 99, line: 42, message: 'bar' }],
				errorCount: 1,
				warningCount: 0
			}
		];

		it('should default to the "stylish" formatter', async () => {
			const eslintInfo = { eslint: new ESLint() };
			const formatter = await util.resolveFormatter(eslintInfo);
			const text = await formatter.format(testResults);
			assert.equal(
				text.replace(/\x1b\[\d+m/g, ''), // eslint-disable-line no-control-regex
				'\nfoo\n  42:99  warning  bar\n\n✖ 1 problem (1 error, 0 warnings)\n'
			);
		});

		it('should resolve a predefined formatter', async () => {
			const eslintInfo = { eslint: new ESLint() };
			const formatter = await util.resolveFormatter(eslintInfo, 'compact');
			const text = await formatter.format(testResults);
			assert.equal(
				text.replace(/\x1b\[\d+m/g, ''), // eslint-disable-line no-control-regex
				'foo: line 42, col 99, Warning - bar\n\n1 problem'
			);
		});

		it('should resolve a custom formatter', async () => {
			const eslintInfo = { eslint: new ESLint({ cwd: __dirname }) };
			const formatter = await util.resolveFormatter(eslintInfo, './custom-formatter');
			await formatter.format(testResults);
			const { args } = require('./custom-formatter');
			assert.equal(args[0], testResults);
			assert.equal(args[1].cwd, __dirname);
			assert(args[1].rulesMeta);
		});

		it('should wrap an ESLint 6 style formatter function into a formatter', async () => {
			const eslintInfo = { cwd: 'TEST CWD', eslint: new ESLint() };
			const legacyFormatter = (actualResults, data) => {
				assert.equal(actualResults, testResults);
				assert(data.rulesMeta);
				assert.equal(data.cwd, 'TEST CWD');
				return 'foo';
			};
			const formatter = await util.resolveFormatter(eslintInfo, legacyFormatter);
			const text = await formatter.format(testResults);
			assert.equal(text, 'foo');
		});

		it('should throw an error if a formatter cannot be resolved', async () => {
			const eslintInfo = { eslint: new ESLint() };
			await assert.rejects(
				() => util.resolveFormatter(eslintInfo, 'missing-formatter'),
				/\bThere was a problem loading formatter\b/
			);
		});

	});

	describe('resolveWritable', () => {

		it('should default to fancyLog', () => {
			const write = util.resolveWritable();
			assert.equal(write, require('fancy-log'));
		});

		it('should write to a (writable) stream', done => {
			let written = false;
			const writable = new Writable({ objectMode: true });
			const testValue = 'Formatted Output';
			const write = util.resolveWritable(writable);
			writable._write = (chunk, encoding, cb) => {
				assert(chunk);
				assert.equal(chunk, testValue);
				written = true;
				cb();
			};
			writable
				.on('error', done)
				.on('finish', () => {
					assert.equal(written, true);
					done();
				});
			write(testValue);
			writable.end();
		});

	});

	describe('writeResults', () => {

		const testResults = [];
		const testRulesMeta = { };
		const testInstance = {
			getRulesMetaForResults(results) {
				assert.strictEqual(results, testResults);
				return testRulesMeta;
			}
		};

		it('should pass the value returned from the formatter to the writer', async () => {
			let writableCallCount = 0;
			const formattedText = 'something happened';
			await util.writeResults(
				testResults,
				{ cwd: process.cwd(), eslint: testInstance },
				(results, { rulesMeta }) => {
					assert(results);
					assert.equal(results, testResults);
					assert.equal(rulesMeta, testRulesMeta);
					return formattedText;
				},
				value => {
					assert(value);
					assert.equal(value, formattedText);
					++writableCallCount;
				}
			);
			assert.equal(writableCallCount, 1);
		});

		it('should not write an empty formatted text', async () => {
			await util.writeResults(
				testResults,
				{ cwd: process.cwd(), eslint: testInstance },
				(results, { rulesMeta }) => {
					assert(results);
					assert.equal(results, testResults);
					assert.equal(rulesMeta, testRulesMeta);
					return '';
				},
				() => assert.fail('Unexpected call')
			);
		});

		it('should not write an undefined', async () => {
			await util.writeResults(
				testResults,
				{ cwd: process.cwd(), eslint: testInstance },
				(results, { rulesMeta }) => {
					assert(results);
					assert.equal(results, testResults);
					assert.equal(rulesMeta, testRulesMeta);
				},
				() => assert.fail('Unexpected call')
			);
		});

	});

});
