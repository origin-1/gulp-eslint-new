/* eslint-env mocha */

'use strict';

const { createVinylDirectory, createVinylFile, noop } = require('./test-util');
const { strict: assert }                              = require('assert');
const { ESLint }                                      = require('eslint');
const gulpESLintNew                                   = require('gulp-eslint-new');
const { PassThrough }                                 = require('stream');

let formatCount;

function createFormatter(expectedFileCount) {
	return function (results, data) {
		assert(data);
		assert(Array.isArray(results));
		assert.equal(results.length, expectedFileCount);
		formatCount++;
		const messageCount = results.reduce((sum, result) => sum + result.messages.length, 0);
		return `${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`;
	};
}

function getFiles() {
	return [
		createVinylDirectory(),
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
		),
		createVinylFile(
			'.ignored.js',
			''
		)
	];
}

let writeCount;

/**
 * Custom ESLint formatted result writer for counting write attempts rather than writing to the
 * console.
 *
 * @param {string} message - A message to count as written.
 */
function outputWriter(message) {
	assert.match(message, /^1 message|\d+ messages$/);
	writeCount++;
}

describe('gulp-eslint-new format', () => {

	const formatResults = createFormatter(4);

	function testWrapError(useError, done) {
		const files = getFiles();
		const lintStream
			= gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true })
				.on('error', done);
		const testMessage = 'Writer Test Error';
		const testErrorName = 'TestError';
		lintStream.pipe(
			gulpESLintNew
				.format(formatResults, () => {
					++writeCount;
					const error = Error(testMessage);
					error.name = testErrorName;
					return useError(error);
				})
				.on('error', err => {
					assert.equal(writeCount, 1);
					assert.equal(err.message, testMessage);
					assert.equal(err.name, testErrorName);
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				})
		);
		files.forEach(file => lintStream.write(file));
		lintStream.end();
	}

	beforeEach(() => {
		formatCount = 0;
		writeCount = 0;
	});

	it('should format all ESLint results at once', done => {
		const files = getFiles();
		const formatStream = gulpESLintNew
			.format(formatResults, outputWriter)
			.on('error', done)
			.on('finish', () => {
				assert.equal(formatCount, 1);
				assert.equal(writeCount, 1);
				done();
			});
		const lintStream
			= gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true })
				.on('error', done);
		lintStream
			.pipe(gulpESLintNew.format(noop, noop)) // Test that files are passed through.
			.pipe(formatStream);
		files.forEach(file => lintStream.write(file));
		lintStream.end();
	});

	it('should not attempt to format when no linting results are found', done => {
		const files = getFiles();
		const formatStream = gulpESLintNew
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

	it('should wrap errors thrown by a synchronous format writer', done => testWrapError(
		error => {
			throw error;
		},
		done
	));

	it('should wrap errors thrown by an asynchronous format writer', done => testWrapError(
		error => new Promise((_, reject) => setImmediate(() => reject(error))),
		done
	));

	it('should emit an error if a linted file has no ESLint instance', done => {
		const file = createVinylFile('file.js', '');
		file.eslint = { };
		gulpESLintNew
			.format()
			.on('error', err => {
				assert.equal(err.fileName, file.path);
				assert.equal(err.message, 'ESLint information not available');
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			})
			.end(file);
	});

	it('should emit an error if the linted files have different ESLint instances', done => {
		const formatStream = gulpESLintNew
			.format()
			.on('error', err => {
				assert.equal(
					err.message,
					'The files in the stream were not processed by the same instance of ESLint'
				);
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			});

		function addFile(path) {
			const file = createVinylFile(path, '');
			file.eslint = { };
			file._eslintInfo = { cwd: process.cwd(), eslint: new ESLint() };
			formatStream.write(file);
		}

		addFile('file1.js');
		addFile('file2.js');
		formatStream.end();
	});

});

describe('gulp-eslint-new formatEach', () => {

	const formatResult = createFormatter(1);

	function testWrapError(useError, done) {
		const files = getFiles();
		const lintStream
			= gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 } }).on('error', done);
		const testMessage = 'Writer Test Error';
		const testErrorName = 'TestError';
		lintStream.pipe(
			gulpESLintNew
				.formatEach(formatResult, () => {
					++writeCount;
					const error = Error(testMessage);
					error.name = testErrorName;
					return useError(error);
				})
				.on('error', err => {
					assert.equal(writeCount, 1);
					assert.equal(err.message, testMessage);
					assert.equal(err.name, testErrorName);
					assert.equal(err.plugin, 'gulp-eslint-new');
					done();
				})
		);
		files.forEach(file => lintStream.write(file));
		lintStream.end();
	}

	beforeEach(() => {
		formatCount = 0;
		writeCount = 0;
	});

	it('should format individual ESLint results', done => {
		const files = getFiles();
		const lintStream
			= gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true })
				.on('error', done);
		lintStream
			.pipe(gulpESLintNew.formatEach(noop, noop)) // Test that files are passed through.
			.pipe(
				gulpESLintNew
					.formatEach(formatResult, outputWriter)
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

	it('should wrap errors thrown by a synchronous format writer', done => testWrapError(
		error => {
			throw error;
		},
		done
	));

	it('should wrap errors thrown by an asynchronous format writer', done => testWrapError(
		error => new Promise((_, reject) => setImmediate(() => reject(error))),
		done
	));

	it('should emit an error if a linted file has no ESLint instance', done => {
		const file = createVinylFile('file.js', '');
		file.eslint = { };
		gulpESLintNew
			.formatEach()
			.on('error', err => {
				assert.equal(err.fileName, file.path);
				assert.equal(err.message, 'ESLint information not available');
				assert.equal(err.plugin, 'gulp-eslint-new');
				done();
			})
			.end(file);
	});

});
