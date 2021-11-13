/* eslint-env mocha */

'use strict';

const { createVinylFile, noop } = require('./test-util');
const { strict: assert }        = require('assert');
const { ESLint }                = require('eslint');
const eslint                    = require('gulp-eslint-new');
const { PassThrough }           = require('stream');
const File                      = require('vinyl');

function getFiles() {
	return [
		new File({
			path: process.cwd(),
			contents: null,
			isDirectory: true
		}),
		createVinylFile(
			'use-strict.js',
			'(function () {\n\n\tvoid 0;\n\n}());\n\n'
		),
		createVinylFile(
			'undeclared.js',
			'(function () {\n\t"use strict";\n\n\tx = 0;\n\n}());\n'
		),
		createVinylFile(
			'passing.js',
			'(function () {\n\n\t"use strict";\n\n}());\n'
		)
	];
}

describe('gulp-eslint-new format function', () => {

	let formatCount;
	let writeCount;

	/**
	 * Custom ESLint formatted result writer for counting write attempts rather than writing to the console.
	 *
	 * @param {string} message - A message to count as written.
	 */
	function outputWriter(message) {
		assert.match(message, /^1 message|\d+ messages$/);
		writeCount++;
	}

	describe('format', () => {

		/**
		 * Custom ESLint result formatter for counting format passes and
		 * returning an expected formatted result message.
		 *
		 * @param {Array} results - ESLint results
		 * @param {Object} config - format config
		 * @returns {string} formatted results
		 */
		function formatResults(results, config) {
			assert(config);
			assert(Array.isArray(results));
			assert.equal(results.length, 3);
			formatCount++;

			const messageCount = results.reduce((sum, result) => {
				return sum + result.messages.length;
			}, 0);

			return `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`;
		}

		beforeEach(() => {
			formatCount = 0;
			writeCount = 0;
		});

		it('should format all ESLint results at once', done => {
			const files = getFiles();
			const formatStream = eslint
				.format(formatResults, outputWriter)
				.on('error', done)
				.on('finish', () => {
					assert.equal(formatCount, 1);
					assert.equal(writeCount, 1);
					done();
				});
			const lintStream
				= eslint({ useEslintrc: false, rules: { 'strict': 2 } }).on('error', done);
			lintStream
				.pipe(eslint.format(noop, noop)) // Test that files are passed through.
				.pipe(formatStream);
			files.forEach(file => lintStream.write(file));
			lintStream.end();
		});

		it('should not attempt to format when no linting results are found', done => {
			const files = getFiles();
			const formatStream = eslint
				.format(formatResults, outputWriter)
				.on('error', done)
				.on('finish', () => {
					assert.equal(formatCount, 0);
					assert.equal(writeCount, 0);
					done();
				});
			const passthruStream = new PassThrough({ objectMode: true }).on('error', done);
			passthruStream.pipe(formatStream);
			files.forEach(file => passthruStream.write(file));
			passthruStream.end();
		});

		it('should emit an error if a linted file has no ESLint instance', done => {
			const file = createVinylFile('file.js', '');
			file.eslint = { };
			eslint
				.format()
				.on('error', err => {
					assert.equal(err.fileName, file.path);
					assert.equal(err.message, 'ESLint instance not found');
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				})
				.end(file);
		});

		it('should emit an error if the linted files have different ESLint instances', done => {
			const formatStream = eslint
				.format()
				.on('error', err => {
					assert.equal(
						err.message,
						'The files in the stream were not processes by the same instance of '
						+ 'ESLint'
					);
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				});

			function addFile(path) {
				const file = createVinylFile(path, '');
				file.eslint = { };
				file._eslintInstance = new ESLint();
				formatStream.write(file);
			}

			addFile('file1.js');
			addFile('file2.js');
			formatStream.end();
		});

	});

	describe('formatEach', () => {

		function formatResult(results, config) {
			assert(config);
			assert(Array.isArray(results));
			assert.equal(results.length, 1);
			formatCount++;
			const messageCount = results.reduce((sum, result) => sum + result.messages.length, 0);
			return `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`;
		}

		it('should format individual ESLint results', done => {
			formatCount = 0;
			writeCount = 0;
			const files = getFiles();
			const lintStream
				= eslint({ useEslintrc: false, rules: { 'strict': 2 } }).on('error', done);
			lintStream
				.pipe(eslint.formatEach(noop, noop)) // Test that files are passed through.
				.pipe(
					eslint.formatEach(formatResult, outputWriter)
						.on('error', done)
						.on('finish', function () {
							// The stream should not have emitted an error.
							assert.equal(this._writableState.errorEmitted, false);
							const fileCount = files.length - 1; // Remove directory.
							assert.equal(formatCount, fileCount);
							assert.equal(writeCount, fileCount);
							done();
						})
				);
			files.forEach(file => lintStream.write(file));
			lintStream.end();
		});

		it('should catch and wrap format writer errors in a PluginError', done => {
			const files = getFiles();
			const lintStream
				= eslint({ useEslintrc: false, rules: { 'strict': 2 } }).on('error', done);
			const testMessage = 'Writer Test Error';
			const testErrorName = 'TestError';
			lintStream.pipe(
				eslint.formatEach(formatResult, message => {
					assert.equal(message, '1 message');
					const error = new Error(testMessage);
					error.name = testErrorName;
					throw error;
				})
					.on('error', err => {
						assert.equal(err.message, testMessage);
						assert.equal(err.name, testErrorName);
						assert.equal(err.plugin, 'gulp-eslint-new');
						done();
					})
			);
			files.forEach(file => lintStream.write(file));
			lintStream.end();
		});

		it('should emit an error if a linted file has no ESLint instance', done => {
			const file = createVinylFile('file.js', '');
			file.eslint = { };
			eslint
				.formatEach()
				.on('error', err => {
					assert.equal(err.fileName, file.path);
					assert.equal(err.message, 'ESLint instance not found');
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				})
				.end(file);
		});

	});

});
