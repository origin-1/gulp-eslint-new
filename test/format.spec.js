/* eslint-env mocha */

'use strict';

const { createVinylFile } = require('./test-util');
const { strict: assert }  = require('assert');
const eslint              = require('gulp-eslint-new');
const stream              = require('stream');
const File                = require('vinyl');

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

describe('gulp-eslint-new format', () => {
	let formatCount;
	let writeCount;

	/**
	 * Custom ESLint formatted result writer for counting write attempts
	 * rather than writing to the console.
	 *
	 * @param {String} message - a message to count as written
	 */
	function outputWriter(message) {
		assert(message);
		assert(/^1 message|\d+ messages$/.test(message));
		writeCount++;
	}

	/**
	 * Custom ESLint formatted result writer that will throw an exception
	 *
	 * @throws Error Always thrown to test error handling in writers
	 * @param {String} message - a message to trigger an error
	 */
	function failWriter(message) {
		const error = new Error(`Writer Test Error${message ? `: ${message}` : ''}`);
		error.name = 'TestError';
		throw error;
	}

	describe('format all results', () => {
		/**
		 * Custom ESLint result formatter for counting format passes and
		 * returning an expected formatted result message.
		 *
		 * @param {Array} results - ESLint results
		 * @param {Object} config - format config
		 * @returns {String} formatted results
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

			const lintStream = eslint({ useEslintrc: false, rules: { 'strict': 2 } });
			lintStream.on('error', done);

			const formatStream = eslint.format(formatResults, outputWriter);

			formatStream
				.on('error', done)
				.on('finish', () => {
					assert.equal(formatCount, 1);
					assert.equal(writeCount, 1);
					done();
				});

			assert(lintStream.pipe);
			lintStream.pipe(formatStream);

			files.forEach(function (file) {
				lintStream.write(file);
			});
			lintStream.end();
		});

		it('should not attempt to format when no linting results are found', done => {
			const files = getFiles();

			const passthruStream = new stream.PassThrough({ objectMode: true })
				.on('error', done);

			const formatStream = eslint.format(formatResults, outputWriter);

			formatStream
				.on('error', done)
				.on('finish', () => {
					assert.equal(formatCount, 0);
					assert.equal(writeCount, 0);
					done();
				});

			assert(passthruStream.pipe);
			passthruStream.pipe(formatStream);

			files.forEach(function (file) {
				passthruStream.write(file);
			});
			passthruStream.end();
		});

	});

	describe('format each result', () => {

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

			const lintStream = eslint({ useEslintrc: false, rules: { 'strict': 2 } })
				.on('error', done);

			const formatStream = eslint.formatEach(formatResult, outputWriter)
				.on('error', done)
				.on('finish', function () {
					// the stream should not have emitted an error
					assert.equal(this._writableState.errorEmitted, false);

					const fileCount = files.length - 1; // remove directory
					assert.equal(formatCount, fileCount);
					assert.equal(writeCount, fileCount);
					done();
				});

			assert(lintStream.pipe);
			lintStream.pipe(formatStream);

			files.forEach(file => lintStream.write(file));
			lintStream.end();
		});

		it('should catch and wrap format writer errors in a PluginError', done => {
			formatCount = 0;
			writeCount = 0;

			const files = getFiles();

			const lintStream = eslint({ useEslintrc: false, rules: { 'strict': 2 } })
				.on('error', done);

			const formatStream = eslint.formatEach(formatResult, failWriter);

			formatStream
				.on('error', err => {
					assert(err);
					assert.equal(err.message, 'Writer Test Error: 1 message');
					assert.equal(err.name, 'TestError');
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				})
				.on('finish', () => {
					done(new Error('Expected PluginError to fail stream'));
				});

			assert(lintStream.pipe);
			lintStream.pipe(formatStream);

			files.forEach(file => lintStream.write(file));
			lintStream.end();
		});

	});

});
