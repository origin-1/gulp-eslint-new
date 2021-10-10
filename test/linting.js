/* global describe, it*/
'use strict';

const assert = require('assert');
const path = require('path');
const eslint = require('..');
const File = require('vinyl');
const stringToStream = require('from2-string');

require('mocha');

describe('gulp-eslint-new plugin', () => {
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
					path.resolve('test/fixtures/stage0-class-property.js')
				);

				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 1);

				assert('message' in file.eslint.messages[0]);
				assert('line' in file.eslint.messages[0]);
				assert('column' in file.eslint.messages[0]);
				assert.strictEqual(file.eslint.messages[0].ruleId, 'prefer-template');

				done();
			})
			.end(new File({
				path: 'test/fixtures/stage0-class-property.js',
				contents: Buffer.from('class MyClass {prop = a + "b" + c;}')
			}));
	});

	it('should support sharable config', done => {
		eslint(path.resolve(__dirname, 'fixtures', 'eslintrc-sharable-config.js'))
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
			.end(new File({
				path: 'test/fixtures/no-newline.js',
				contents: Buffer.from('console.log(\'Hi\');')
			}));
	});

	it('should produce expected message via buffer', done => {
		eslint({useEslintrc: false, rules: {strict: [2, 'global']}})
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(file.contents);
				assert(file.eslint);
				assert.strictEqual(
					file.eslint.filePath,
					path.resolve('test/fixtures/use-strict.js')
				);

				assert(Array.isArray(file.eslint.messages));
				assert.strictEqual(file.eslint.messages.length, 1);

				assert('message' in file.eslint.messages[0]);
				assert('line' in file.eslint.messages[0]);
				assert('column' in file.eslint.messages[0]);
				assert.strictEqual(file.eslint.messages[0].ruleId, 'strict');

				done();
			})
			.end(new File({
				path: 'test/fixtures/use-strict.js',
				contents: Buffer.from('var x = 1;')
			}));
	});

	it('should ignore files with null content', done => {
		eslint({useEslintrc: false, rules: {'strict': 2}})
			.on('error', done)
			.on('data', file => {
				assert(file);
				assert(!file.contents);
				assert(!file.eslint);
				done();
			})
			.end(new File({
				path: 'test/fixtures',
				isDirectory: true
			}));
	});

	it('should emit an error when it takes a steam content', done => {
		eslint({useEslintrc: false, rules: {'strict': 'error'}})
			.on('error', err => {
				assert.strictEqual(err.plugin, 'gulp-eslint-new');
				assert.strictEqual(
					err.message,
					'gulp-eslint-new doesn\'t support vinyl files with Stream contents.'
				);
				done();
			})
			.end(new File({
				path: 'test/fixtures/stream.js',
				contents: stringToStream('')
			}));
	});

	it('should throw an error when it fails to load a plugin', done => {
		const pluginName = 'this-is-unknown-plugin';
		eslint({plugins: [pluginName]})
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
			.end(new File({
				path: 'test/fixtures/file.js',
				contents: Buffer.from('')
			}));
	});

	describe('"warnFileIgnored" option', () => {

		it('when true, should warn when a file is ignored by .eslintignore', done => {
			eslint({useEslintrc: false, warnFileIgnored: true})
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(
						file.eslint.messages[0].message,
						'File ignored because of .eslintignore file'
					);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(new File({
					path: 'test/fixtures/ignored.js',
					contents: Buffer.from('(function () {ignore = abc;}});')
				}));
		});

		it('when true, should warn when a "node_modules" file is ignored', done => {
			eslint({useEslintrc: false, warnFileIgnored: true})
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(
						file.eslint.messages[0].message,
						'File ignored because it has a node_modules/** path'
					);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(new File({
					path: 'node_modules/test/index.js',
					contents: Buffer.from('(function () {ignore = abc;}});')
				}));
		});

		it('when not true, should silently ignore files', done => {
			eslint({useEslintrc: false, warnFileIgnored: false})
				.on('error', done)
				.on('data', file => {
					assert(file);
					assert(!file.eslint);
					done();
				})
				.end(new File({
					path: 'test/fixtures/ignored.js',
					contents: Buffer.from('(function () {ignore = abc;}});')
				}));
		});

	});

	describe('"quiet" option', () => {

		it('when true, should remove warnings', done => {
			eslint({quiet: true, useEslintrc: false, rules: {'no-undef': 1, 'strict': 2}})
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(file.eslint.errorCount, 1);
					assert.strictEqual(file.eslint.warningCount, 0);
					done();
				})
				.end(new File({
					path: 'test/fixtures/invalid.js',
					contents: Buffer.from('function z() { x = 0; }')
				}));
		});

		it('when a function, should filter messages', done => {
			function warningsOnly(message) {
				return message.severity === 1;
			}
			eslint({quiet: warningsOnly, useEslintrc: false, rules: {'no-undef': 1, 'strict': 2}})
				.on('data', file => {
					assert(file);
					assert(file.eslint);
					assert(Array.isArray(file.eslint.messages));
					assert.strictEqual(file.eslint.messages.length, 1);
					assert.strictEqual(file.eslint.errorCount, 0);
					assert.strictEqual(file.eslint.warningCount, 1);
					done();
				})
				.end(new File({
					path: 'test/fixtures/invalid.js',
					contents: Buffer.from('function z() { x = 0; }')
				}));
		});

	});

	describe('"fix" option', () => {

		it('when true, should update buffered contents', done => {
			eslint({fix: true, useEslintrc: false, rules: {'no-trailing-spaces': 2}})
				.on('error', done)
				.on('data', (file) => {
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
				.end(new File({
					path: 'test/fixtures/fixable.js',
					contents: Buffer.from('var x = 0; ')
				}));
		});
	});

});
