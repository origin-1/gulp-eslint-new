/* eslint-env mocha */

'use strict';

const { createVinylFile, finished, noop } = require('./test-util');
const { strict: assert }                  = require('assert');
const eslint                              = require('gulp-eslint-new');
const { join, resolve }                   = require('path');
const { Readable }                        = require('stream');
const File                                = require('vinyl');

describe('gulp-eslint-new plugin', () => {

	beforeEach(() => {
		process.chdir('test/fixtures');
	});

	afterEach(() => {
		process.chdir('../..');
	});

	it('should configure an alternate parser', async () => {
		require('@typescript-eslint/parser').clearCaches();
		const file = createVinylFile('file.ts', 'function fn(): void { }');
		await finished(
			eslint({
				parser: '@typescript-eslint/parser',
				useEslintrc: false,
				rules: { 'eol-last': 'error' }
			})
				.on('data', noop)
				.on('end', () => {
					for (const key of Object.keys(require('tslib'))) {
						delete global[key];
					}
				})
				.end(file)
		);
		assert.equal(file.eslint.filePath, file.path);
		assert(Array.isArray(file.eslint.messages));
		assert.equal(file.eslint.messages.length, 1);
		const [message] = file.eslint.messages;
		assert.equal(typeof message.message, 'string');
		assert.equal(typeof message.line, 'number');
		assert.equal(typeof message.column, 'number');
		assert.equal(message.ruleId, 'eol-last');
		assert.equal(message.severity, 2);
	});

	it('should produce expected message via buffer', async () => {
		const file = createVinylFile('use-strict.js', 'var x = 1;');
		await finished(
			eslint({ useEslintrc: false, rules: { strict: [2, 'global'] } })
				.on('data', noop)
				.end(file)
		);
		assert.equal(file.eslint.filePath, file.path);
		assert(Array.isArray(file.eslint.messages));
		assert.equal(file.eslint.messages.length, 1);
		const [message] = file.eslint.messages;
		assert.equal(typeof message.message, 'string');
		assert.equal(typeof message.line, 'number');
		assert.equal(typeof message.column, 'number');
		assert.equal(message.ruleId, 'strict');
		assert.equal(message.severity, 2);
	});

	it('should ignore files with null content', async () => {
		const file = new File({
			path: process.cwd(),
			isDirectory: true
		});
		await finished(
			eslint({ useEslintrc: false, rules: { 'strict': 2 } }).on('data', noop).end(file)
		);
		assert(!file.eslint);
	});

	it('should emit an error when it takes a stream content', async () => {
		await assert.rejects(
			finished(
				eslint({ useEslintrc: false, rules: { 'strict': 'error' } })
					.end(new File({ path: resolve('stream.js'), contents: Readable.from(['']) }))
			),
			{
				message: 'gulp-eslint-new doesn\'t support Vinyl files with Stream contents.',
				plugin: 'gulp-eslint-new'
			}
		);
	});

	it('should emit an error when it fails to load a plugin', async () => {
		const pluginName = 'this-is-unknown-plugin';
		let err;
		await assert.rejects(
			finished(
				eslint({ plugins: [pluginName] })
					.on('error', error => {
						err = error;
					})
					.end(createVinylFile('file.js', ''))
			)
		);
		assert.equal(err.plugin, 'gulp-eslint-new');
		assert.equal(err.name, 'Error');
		assert.equal(err.code, 'MODULE_NOT_FOUND');
		// Remove stack trace from error message as it's machine-dependent.
		const message = err.message.replace(/\n.*$/s, '');
		assert.equal(
			message,
			`Failed to load plugin '${
				pluginName
			}' declared in 'CLIOptions': Cannot find module 'eslint-plugin-${
				pluginName
			}'`
		);
	});

	it('"rulePaths" option should be considered', async () => {
		const file = createVinylFile('file.js', '');
		await finished(
			eslint({
				useEslintrc: false,
				rulePaths: ['../custom-rules'],
				overrideConfig: { rules: { 'ok': 'error' } }
			})
				.on('data', noop)
				.end(file)
		);
		assert.equal(file.eslint.filePath, file.path);
		assert(Array.isArray(file.eslint.messages));
		assert.equal(file.eslint.messages.length, 0);
	});

	describe('should support a sharable config', () => {

		async function test(options, filePath) {
			const file = createVinylFile(filePath, 'console.log(\'Hi\');');
			await finished(eslint(options).on('data', noop).end(file));
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 1);
			const [message] = file.eslint.messages;
			assert.equal(typeof message.message, 'string');
			assert.equal(typeof message.line, 'number');
			assert.equal(typeof message.column, 'number');
			assert.equal(message.ruleId, 'eol-last');
			assert.equal(message.severity, 2);
		}

		it('with an absolute path', async () => {
			await test(
				{
					overrideConfigFile: join(__dirname, 'eslintrc-sharable-config.js'),
					useEslintrc: false
				},
				'no-newline.js'
			);
		});

		it('with a relative path', async () => {
			await test(
				{
					cwd: __dirname,
					overrideConfigFile: 'eslintrc-sharable-config.js',
					useEslintrc: false
				},
				'no-newline.js'
			);
		});

	});

	describe('"useEslintrc" option', () => {

		it('when true, should consider a configuration file', async () => {
			const file = createVinylFile('semi/file.js', '$()');
			await finished(eslint({ useEslintrc: true }).on('data', noop).end(file));
			assert(Array.isArray(file.eslint.messages));
			const [message] = file.eslint.messages;
			assert.equal(typeof message.message, 'string');
			assert.equal(typeof message.line, 'number');
			assert.equal(typeof message.column, 'number');
			assert.equal(message.ruleId, 'semi');
			assert.equal(message.severity, 2);
			assert.equal(file.eslint.filePath, file.path);
			assert.equal(file.eslint.errorCount, 1);
			assert.equal(file.eslint.warningCount, 0);
			assert.equal(file.eslint.fixableErrorCount, 1);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
		});

		it('when false, should ignore a configuration file', async () => {
			const file = createVinylFile('semi/file.js', '$()');
			await finished(eslint({ useEslintrc: false }).on('data', noop).end(file));
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 0);
		});

	});

	describe('"warnFileIgnored" option', () => {

		it('when true, should warn when a file is ignored by .eslintignore', async () => {
			const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
			await finished(
				eslint({ useEslintrc: false, warnFileIgnored: true }).on('data', noop).end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.deepEqual(
				file.eslint.messages,
				[
					{
						fatal: false,
						message:
						'File ignored because of a matching ignore pattern. Set '
						+ '"ignore" option to false to override.',
						severity: 1
					}
				]
			);
			assert.equal(file.eslint.errorCount, 0);
			assert.equal(file.eslint.warningCount, 1);
			assert.equal(file.eslint.fixableErrorCount, 0);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
		});

		it('when true, should warn when a "node_modules" file is ignored', async () => {
			const file = createVinylFile(
				'node_modules/test/index.js',
				'(function () {ignore = abc;}});'
			);
			await finished(
				eslint({ useEslintrc: false, warnFileIgnored: true }).on('data', noop).end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.deepEqual(
				file.eslint.messages,
				[
					{
						fatal: false,
						message:
						'File ignored by default. Use a negated ignore pattern like '
						+ '"!node_modules/*" to override.',
						severity: 1
					}
				]
			);
			assert.equal(file.eslint.errorCount, 0);
			assert.equal(file.eslint.warningCount, 1);
			assert.equal(file.eslint.fixableErrorCount, 0);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
		});

		it('when not true, should silently ignore files', async () => {
			const file = createVinylFile('ignored.js', '(function () {ignore = abc;}});');
			await finished(
				eslint({ useEslintrc: false, warnFileIgnored: false }).on('data', noop).end(file)
			);
			assert(!file.eslint);
		});

	});

	describe('"quiet" option', () => {

		it('when true, should remove warnings', async () => {
			const file = createVinylFile('invalid.js', 'function z() { x = 0; }');
			await finished(
				eslint({ quiet: true, useEslintrc: false, rules: { 'no-undef': 1, 'strict': 2 } })
					.on('data', noop)
					.end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 1);
			assert.equal(file.eslint.errorCount, 1);
			assert.equal(file.eslint.warningCount, 0);
			assert.equal(file.eslint.fixableErrorCount, 0);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
		});

		it('when a function, should filter messages', async () => {
			const file = createVinylFile('invalid.js', 'function z() { x = 0; }');
			await finished(
				eslint(
					{
						quiet: ({ severity }) => severity === 1,
						useEslintrc: false,
						rules: { 'no-undef': 1, 'strict': 2 }
					}
				)
					.on('data', noop)
					.end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 1);
			assert.equal(file.eslint.errorCount, 0);
			assert.equal(file.eslint.warningCount, 1);
			assert.equal(file.eslint.fixableErrorCount, 0);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
		});

	});

	describe('"fix" option', () => {

		it('when true, should update buffered contents', async () => {
			const file = createVinylFile('fixable.js', 'var x = 0; ');
			await finished(
				eslint({ fix: true, useEslintrc: false, rules: { 'no-trailing-spaces': 2 } })
					.on('data', noop)
					.end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 0);
			assert.equal(file.eslint.errorCount, 0);
			assert.equal(file.eslint.warningCount, 0);
			assert.equal(file.eslint.fixableErrorCount, 0);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
			assert.equal(file.eslint.output, 'var x = 0;');
			assert.equal(file.contents.toString(), 'var x = 0;');
		});

		it('when a function, should update buffered contents', async () => {
			const file = createVinylFile('fixable.js', 'var x = 0; \nvar y = 1; ');
			await finished(
				eslint(
					{
						fix: ({ line }) => line > 1,
						useEslintrc: false,
						rules: { 'no-trailing-spaces': 2 }
					}
				)
					.on('data', noop)
					.end(file)
			);
			assert.equal(file.eslint.filePath, file.path);
			assert(Array.isArray(file.eslint.messages));
			assert.equal(file.eslint.messages.length, 1);
			assert.equal(file.eslint.errorCount, 1);
			assert.equal(file.eslint.warningCount, 0);
			assert.equal(file.eslint.fixableErrorCount, 1);
			assert.equal(file.eslint.fixableWarningCount, 0);
			assert.equal(file.eslint.fatalErrorCount, 0);
			assert.equal(file.eslint.output, 'var x = 0; \nvar y = 1;');
			assert.equal(file.contents.toString(), 'var x = 0; \nvar y = 1;');
		});

	});

});
