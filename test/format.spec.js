/* eslint-env mocha */

'use strict';

const { createVinylDirectory, createVinylFile, noop } = require('./test-util');
const { strict: assert }                              = require('assert');
const gulpESLintNew                                   = require('gulp-eslint-new');
const PluginError                                     = require('plugin-error');
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

function runStream(stream, files, lintStream = stream) {
    return new Promise((resolve, reject) => {
        stream.on('error', reject).on('finish', resolve);
        files.forEach(file => lintStream.write(file));
        lintStream.end();
    });
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

    async function testWrapError(useError) {
        const files = getFiles();
        const lintStream
        = gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true });
        const testMessage = 'Writer Test Error';
        const testErrorName = 'TestError';
        const formatStream = gulpESLintNew
            .format(formatResults, () => {
                ++writeCount;
                const error = Error(testMessage);
                error.name = testErrorName;
                return useError(error);
            });
        lintStream.pipe(formatStream);
        await assert.rejects(
            runStream(formatStream, files, lintStream),
            {
                constructor: PluginError,
                message: testMessage,
                name: testErrorName,
                plugin: 'gulp-eslint-new'
            }
        );
        assert.equal(writeCount, 1);
    }

    beforeEach(() => {
        formatCount = 0;
        writeCount = 0;
    });

    it('should format all ESLint results at once', async () => {
        const files = getFiles();
        const lintStream
        = gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true });
        const formatStream = gulpESLintNew.format(formatResults, outputWriter);
        let errorEmitted;
        formatStream.on(
            'finish',
            function () {
                // The stream should not have emitted an error.
                ({ errorEmitted } = this._writableState);
            }
        );
        lintStream
            .pipe(gulpESLintNew.format(noop, noop)) // Test that files are passed through.
            .pipe(formatStream);
        await runStream(formatStream, files, lintStream);
        assert.equal(errorEmitted, false);
        assert.equal(formatCount, 1);
        assert.equal(writeCount, 1);
    });

    it('should not attempt to format when no linting results are found', async () => {
        const files = getFiles();
        const formatStream = gulpESLintNew.format(formatResults, outputWriter);
        const passthruStream = new PassThrough({ objectMode: true });
        passthruStream.pipe(formatStream);
        await runStream(passthruStream, files);
        assert.equal(formatCount, 0);
        assert.equal(writeCount, 0);
    });

    it('should wrap errors thrown by a synchronous format writer', () => testWrapError(
        error => {
            throw error;
        }
    ));

    it('should wrap errors thrown by an asynchronous format writer', () => testWrapError(
        error => new Promise((_, reject) => setImmediate(() => reject(error)))
    ));

    it('should emit an error if a linted file has no ESLint instance', async () => {
        const file = createVinylFile('file.js', '');
        file.eslint = { };
        await assert.rejects(
            runStream(gulpESLintNew.format(), [file]),
            {
                constructor: PluginError,
                fileName: file.path,
                message: 'ESLint information not available',
                plugin: 'gulp-eslint-new'
            }
        );
    });

    it('should emit an error if the linted files have different ESLint instances', async () => {
        const createTestFile = path => {
            const file = createVinylFile(path, '');
            file.eslint = { };
            file._eslintInfo = { cwd: process.cwd(), eslint: { } };
            return file;
        };
        const files = [createTestFile('file1.js'), createTestFile('file2.js')];
        await assert.rejects(
            runStream(gulpESLintNew.format(), files),
            {
                constructor: PluginError,
                message:
                'The files in the stream were not processed by the same instance of ESLint',
                plugin: 'gulp-eslint-new'
            }
        );
    });

});

describe('gulp-eslint-new formatEach', () => {

    const formatResult = createFormatter(1);

    async function testWrapError(useError) {
        const files = getFiles();
        const lintStream = gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 } });
        const testMessage = 'Writer Test Error';
        const testErrorName = 'TestError';
        const formatStream = gulpESLintNew
            .formatEach(formatResult, () => {
                ++writeCount;
                const error = Error(testMessage);
                error.name = testErrorName;
                return useError(error);
            });
        lintStream.pipe(formatStream);
        await assert.rejects(
            runStream(formatStream, files, lintStream),
            {
                constructor: PluginError,
                message: testMessage,
                name: testErrorName,
                plugin: 'gulp-eslint-new'
            }
        );
        assert.equal(writeCount, 1);
    }

    beforeEach(() => {
        formatCount = 0;
        writeCount = 0;
    });

    it('should format individual ESLint results', async () => {
        const files = getFiles();
        const lintStream
        = gulpESLintNew({ useEslintrc: false, rules: { 'strict': 2 }, warnIgnored: true });
        const formatStream = gulpESLintNew.formatEach(formatResult, outputWriter);
        let errorEmitted;
        formatStream.on(
            'finish',
            function () {
                // The stream should not have emitted an error.
                ({ errorEmitted } = this._writableState);
            }
        );
        lintStream
            .pipe(gulpESLintNew.formatEach(noop, noop)) // Test that files are passed through.
            .pipe(formatStream);
        await runStream(formatStream, files, lintStream);
        assert.equal(errorEmitted, false);
        const fileCount = files.length - 1; // Remove directory.
        assert.equal(formatCount, fileCount);
        assert.equal(writeCount, fileCount);
    });

    it('should memoize formatters per ESLint instance', async () => {
        const createTestFile = eslintInstance => {
            const file = createVinylFile('', '');
            file.eslint = { };
            file._eslintInfo = { eslint: eslintInstance };
            return file;
        };
        let loadFormatterCallCount = 0;
        const loadFormatter = () => {
            ++loadFormatterCallCount;
            return { format: noop };
        };
        const eslint1 = { loadFormatter };
        const eslint2 = { loadFormatter };
        const files = [
            createVinylDirectory(),
            createTestFile(eslint1),
            createTestFile(eslint2),
            createTestFile(eslint1),
            createTestFile(eslint2)
        ];
        await runStream(gulpESLintNew.formatEach(), files);
        assert.equal(loadFormatterCallCount, 2);
    });

    it('should not attempt to format when no linting results are found', async () => {
        const files = getFiles();
        const formatStream = gulpESLintNew.formatEach(formatResult, outputWriter);
        const passthruStream = new PassThrough({ objectMode: true });
        passthruStream.pipe(formatStream);
        await runStream(passthruStream, files);
        assert.equal(formatCount, 0);
        assert.equal(writeCount, 0);
    });

    it('should wrap errors thrown by a synchronous format writer', () => testWrapError(
        error => {
            throw error;
        }
    ));

    it('should wrap errors thrown by an asynchronous format writer', () => testWrapError(
        error => new Promise((_, reject) => setImmediate(() => reject(error)))
    ));

    it('should emit an error if a linted file has no ESLint instance', async () => {
        const file = createVinylFile('file.js', '');
        file.eslint = { };
        await assert.rejects(
            runStream(gulpESLintNew.formatEach(), [file]),
            {
                constructor: PluginError,
                fileName: file.path,
                message: 'ESLint information not available',
                plugin: 'gulp-eslint-new'
            }
        );
    });

});
