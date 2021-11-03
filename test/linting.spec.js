/* eslint-env mocha */

'use strict';

const eslint              = require('..');
const { createVinylFile } = require('./test-util');
const assert              = require('assert');
const stringToStream      = require('from2-string');
const { resolve }         = require('path');
const File                = require('vinyl');

require('mocha');

describe('gulp-eslint-new plugin', () => {

	beforeEach(() => {
		process.chdir('test/fixtures');
	});

	afterEach(() => {
		process.chdir('../..');
	});

	it('should configure an alternate parser', done => {
		eslint({
			envs: [],
			globals: [],
			ignorePattern: [],
			parser: '@babel/eslint-parser',
			parserOptions: { requireConfigFile: false },
			useEslintrc: false,
			rules: { 'prefer-template': 'error' }
		})
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(file.contents);
				assert(file.eslint);
				assert.strictEqual(
					file.eslint.filePath,
					resolve('stage0-class-property.js')
				);
				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 1);
				assert('message' in file.eslint.messages[0]);
				assert('line' in file.eslint.messages[0]);
				assert('column' in file.eslint.messages[0]);
				assert.strictEqual(file.eslint.messages[0].ruleId, 'prefer-template');
				done();
			})
			.end(
				createVinylFile('stage0-class-property.js', 'class MyClass {prop = a + "b" + c;}')
			);
	});

	it('should produce expected message via buffer', done => {
		eslint({ useEslintrc: false, rules: { strict: [2, 'global'] } })
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(file.contents);
				assert(file.eslint);
				assert.strictEqual(
					file.eslint.filePath,
					resolve('use-strict.js')
				);
				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 1);
				assert('message' in file.eslint.messages[0]);
				assert('line' in file.eslint.messages[0]);
				assert('column' in file.eslint.messages[0]);
				assert.strictEqual(file.eslint.messages[0].ruleId, 'strict');
				done();
			})
			.end(createVinylFile('use-strict.js', 'var x = 1;'));
	});

	it('should ignore files with null content', done => {
		eslint({ useEslintrc: false, rules: { 'strict': 2 } })
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(!file.contents);
				assert(!file.eslint);
				done();
			})
			.end(new File({
				path: process.cwd(),
				isDirectory: true
			}));
	});

	it('should emit an error when it takes a stream content', done => {
		eslint({ useEslintrc: false, rules: { 'strict': 'error' } })
			.on('error', err => {
				assert.strictEqual(err.plugin, 'gulp-eslint-new');
				assert.strictEqual(
					err.message,
					'gulp-eslint-new doesn\'t support vinyl files with Stream contents.'
				);
				done();
			})
			.end(new File({
				path: resolve('stream.js'),
				contents: stringToStream('')
			}));
	});

	it('should throw an error when it fails to load a plugin', done => {
		const pluginName = 'this-is-unknown-plugin';
		eslint({ plugins: [pluginName] })
			.on('error', err => {
				assert.strictEqual(err.plugin, 'gulp-eslint-new');
				// Remove stack trace from error message as it's machine-dependent
				const message = err.message.split('\n')[0];
				assert.strictEqual(
					message,
					`Failed to load plugin '${
						pluginName
					}' declared in 'CLIOptions': Cannot find module 'eslint-plugin-${
						pluginName
					}'`
				);
				done();
			})
			.end(createVinylFile('file.js', ''));
	});

	it('"rulePaths" option should be considered', done => {
		eslint({
			useEslintrc: false,
			rulePaths: ['../custom-rules'],
			overrideConfig: { rules: { 'ok': 'error' } }
		})
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(file.contents);
				assert(file.eslint);
				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 0);
				assert.strictEqual(file.eslint.errorCount, 0);
				assert.strictEqual(file.eslint.warningCount, 0);
				done();
			})
			.end(createVinylFile('any.js', ''));
	});

	it('Cache-related options should be ignored', done => {
		eslint({
			useEslintrc: false,
			cache: true,
			cacheLocation: '\0',
			cacheStrategy: 'metadata'
		})
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(file.contents);
				assert(file.eslint);
				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 0);
				assert.strictEqual(file.eslint.errorCount, 0);
				assert.strictEqual(file.eslint.warningCount, 0);
				done();
			})
			.end(createVinylFile('any.js', ''));
	});

	describe('should support a sharable config', () => {

		function test(options, filePath, done) {
			eslint(options)
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.contents);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert('message' in file.eslint.messages[0]);
					assert('line' in file.eslint.messages[0]);
					assert('column' in file.eslint.messages[0]);
					assert.strictEqual(file.eslint.messages[0].ruleId, 'eol-last');
					done();
				})
				.end(createVinylFile(filePath, 'console.log(\'Hi\');'));
		}

		it('with an absolute path', done => {
			test(
				{
					overrideConfigFile: resolve(__dirname, 'eslintrc-sharable-config.js'),
					useEslintrc: false
				},
				'no-newline.js',
				done
			);
		});

		it('with a relative path', done => {
			test(
				{
					cwd: __dirname,
					overrideConfigFile: 'eslintrc-sharable-config.js',
					useEslintrc: false
				},
				'no-newline.js',
				done
			);
		});

	});

	describe('"useEslintrc" option', () => {

		it('when true, should consider a configuration file', done => {
			eslint({ useEslintrc: true })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(
						file.eslint.messages[0].message,
						'Missing semicolon.'
					);
					assert.strictEqual(file.eslint.errorCount, 1);
					assert.strictEqual(file.eslint.warningCount, 0);
					assert.strictEqual(file.contents.toString(), '$()');
					done();
				})
				.end(createVinylFile('semi/file.js', '$()'));
		});

		it('when false, should ignore a configuration file', done => {
			eslint({ useEslintrc: false })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 0);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 0);
					assert.strictEqual(file.contents.toString(), '$()');
					done();
				})
				.end(createVinylFile('semi/file.js', '$()'));
		});

	});

	describe('"warnFileIgnored" option', () => {

		it('when true, should warn when a file is ignored by .eslintignore', done => {
			eslint({ useEslintrc: false, warnFileIgnored: true })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(
						file.eslint.messages[0].message,
						'File ignored because of a matching ignore pattern. Set "ignore" option '
						+ 'to false to override.'
					);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(createVinylFile('ignored.js', '(function () {ignore = abc;}});'));
		});

		it('when true, should warn when a "node_modules" file is ignored', done => {
			eslint({ useEslintrc: false, warnFileIgnored: true })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(
						file.eslint.messages[0].message,
						'File ignored by default. Use a negated ignore pattern like '
						+ '"!node_modules/*" to override.'
					);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(
					createVinylFile(
						'node_modules/test/index.js',
						'(function () {ignore = abc;}});'
					)
				);
		});

		it('when not true, should silently ignore files', done => {
			eslint({ useEslintrc: false, warnFileIgnored: false })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(!file.eslint);
					done();
				})
				.end(createVinylFile('ignored.js', '(function () {ignore = abc;}});'));
		});

	});

	describe('"quiet" option', () => {

		it('when true, should remove warnings', done => {
			eslint({ quiet: true, useEslintrc: false, rules: { 'no-undef': 1, 'strict': 2 } })
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(file.eslint.errorCount, 1);
					assert.strictEqual(file.eslint.warningCount, 0);
					done();
				})
				.end(createVinylFile('invalid.js', 'function z() { x = 0; }'));
		});

		it('when a function, should filter messages', done => {
			function warningsOnly(message) {
				return message.severity === 1;
			}
			eslint(
				{ quiet: warningsOnly, useEslintrc: false, rules: { 'no-undef': 1, 'strict': 2 } }
			)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(createVinylFile('invalid.js', 'function z() { x = 0; }'));
		});

	});

	describe('"fix" option', () => {

		it('when true, should update buffered contents', done => {
			eslint({ fix: true, useEslintrc: false, rules: { 'no-trailing-spaces': 2 } })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 0);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 0);
					assert.strictEqual(file.eslint.output, 'var x = 0;');
					assert.strictEqual(file.contents.toString(), 'var x = 0;');
					done();
				})
				.end(createVinylFile('fixable.js', 'var x = 0; '));
		});

		it('when a function, should update buffered contents accordingly', done => {
			function fix({ line }) {
				return line > 1;
			}
			eslint({ fix, useEslintrc: false, rules: { 'no-trailing-spaces': 2 } })
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(file.eslint.errorCount, 1);
					assert.strictEqual(file.eslint.warningCount, 0);
					assert.strictEqual(file.eslint.output, 'var x = 0; \nvar y = 1;');
					assert.strictEqual(file.contents.toString(), 'var x = 0; \nvar y = 1;');
					done();
				})
				.end(createVinylFile('fixable.js', 'var x = 0; \nvar y = 1; '));
		});

	});

});
