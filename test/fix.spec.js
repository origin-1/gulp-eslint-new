'use strict';

const { GULP_DEST_KEY, GULP_WARN_KEY, createTransform }         = require('#util');
const { createVinylDirectory, createVinylFile, finishStream }   = require('./test-util');
const { strict: assert }                                        = require('assert');

const { existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync } =
require('fs');

const gulpESLintNew                                             = require('gulp-eslint-new');
const { tmpdir }                                                = require('os');
const { join }                                                  = require('path');
const PluginError                                               = require('plugin-error');
const { PassThrough, Transform }                                = require('stream');
const VinylFile                                                 = require('vinyl');

describe
(
    'gulp-eslint-new fix',
    () =>
    {
        it
        (
            'should ignore files with null content',
            done =>
            {
                const file = createVinylDirectory();
                gulpESLintNew.fix().on('finish', done).end(file);
            },
        );

        it
        (
            'should fix only a fixed file',
            done =>
            {
                let actualDestArg;
                const actualFiles = [];
                const testStream =
                gulpESLintNew.fix
                (
                    {
                        [GULP_DEST_KEY]:
                        destArg =>
                        {
                            actualDestArg = destArg;
                            return createTransform
                            (
                                file =>
                                {
                                    actualFiles.push(file);
                                },
                            );
                        },
                    },
                );
                const base = 'foobar';
                assert.equal(actualDestArg({ base }), base);
                const eslintInfo = { fix: true };
                const unfixedFile = createVinylFile('unfixed', 'unfixed');
                unfixedFile.eslint = { };
                unfixedFile._eslintInfo = eslintInfo;
                const fixedFile = createVinylFile('fixed', 'fixed');
                fixedFile.eslint = { fixed: true };
                fixedFile._eslintInfo = eslintInfo;
                const ignoredFile = createVinylFile('ignored', 'ignored');
                const directory = createVinylDirectory();
                testStream.on
                (
                    'finish',
                    () =>
                    {
                        assert.deepEqual(actualFiles, [fixedFile]);
                        done();
                    },
                );
                testStream.write(unfixedFile);
                testStream.write(fixedFile);
                testStream.write(ignoredFile);
                testStream.write(directory);
                testStream.end();
            },
        );

        it
        (
            'should write a fixed file and pass all files through when the next stream is slow',
            async () =>
            {
                const tmpDir = mkdtempSync(join(tmpdir(), 'gulp-eslint-new-'));
                const fixedFilePath = join(tmpDir, 'file0.js');
                try
                {
                    const eslintInfo = { fix: true };
                    const files = [];
                    for (let index = 0; index < 100; index++)
                    {
                        const file =
                        new VinylFile
                        (
                            {
                                base:       tmpDir,
                                path:       join(tmpDir, `file${index}.js`),
                                contents:   Buffer.from('fixed'),
                            },
                        );
                        file.eslint = index ? { } : { fixed: true };
                        file._eslintInfo = eslintInfo;
                        files.push(file);
                    }
                    const actualFiles = [];
                    const slowStream =
                    new Transform
                    (
                        {
                            highWaterMark:  1,
                            objectMode:     true,
                            transform(file, encoding, done)
                            {
                                actualFiles.push(file);
                                setTimeout(done, 1, null, file);
                            },
                        },
                    );
                    const testStream = gulpESLintNew.fix();
                    testStream.pipe(slowStream);
                    for (const file of files)
                        testStream.write(file);
                    testStream.end();
                    await finishStream(slowStream);
                    assert.deepEqual(actualFiles, files);
                    assert.equal(readFileSync(fixedFilePath, 'utf8'), 'fixed');
                }
                finally
                {
                    if (existsSync(fixedFilePath))
                        unlinkSync(fixedFilePath);
                    rmdirSync(tmpDir);
                }
            },
        );

        it
        (
            'should emit an error raised by the destination stream while idle',
            async () =>
            {
                const destError = Error('Destination stream error');
                let dest;
                const testStream =
                gulpESLintNew.fix
                (
                    {
                        [GULP_DEST_KEY]:
                        () =>
                        {
                            dest = new PassThrough({ objectMode: true });
                            return dest;
                        },
                    },
                );
                dest.emit('error', destError);
                const file = createVinylFile('fixed.js', '');
                file.eslint = { fixed: true };
                file._eslintInfo = { fix: true };
                await assert.rejects
                (
                    finishStream(testStream.end(file)),
                    {
                        constructor:    PluginError,
                        message:        'Destination stream error',
                        plugin:         'gulp-eslint-new',
                        showStack:      true,
                    },
                );
            },
        );

        it
        (
            'should emit an error raised by the destination stream while writing a file',
            async () =>
            {
                const destError = Error('Destination stream error');
                const testStream =
                gulpESLintNew.fix
                (
                    {
                        [GULP_DEST_KEY]:
                        () =>
                        new Transform
                        (
                            {
                                objectMode: true,
                                transform(file, encoding, done)
                                {
                                    done(destError);
                                },
                            },
                        ),
                    },
                );
                const file = createVinylFile('fixed.js', '');
                file.eslint = { fixed: true };
                file._eslintInfo = { fix: true };
                await assert.rejects
                (
                    finishStream(testStream.end(file)),
                    {
                        constructor:    PluginError,
                        message:        'Destination stream error',
                        plugin:         'gulp-eslint-new',
                        showStack:      true,
                    },
                );
            },
        );

        it
        (
            'should raise a warning if a file was linted without the option "fix"',
            done =>
            {
                let warnCount = 0;
                const testStream =
                gulpESLintNew.fix
                (
                    {
                        [GULP_WARN_KEY]:
                        () =>
                        {
                            warnCount++;
                        },
                    },
                );
                const eslintInfo = { };
                {
                    const file1 = createVinylFile('file1.js', '');
                    file1.eslint = { };
                    file1._eslintInfo = eslintInfo;
                    testStream.write(file1);
                }
                {
                    const file2 = createVinylFile('file2.js', '');
                    file2.eslint = { };
                    file2._eslintInfo = eslintInfo;
                    testStream.write(file2);
                }
                testStream.on
                (
                    'finish',
                    () =>
                    {
                        assert.deepEqual(warnCount, 1);
                        done();
                    },
                );
                testStream.end();
            },
        );

        it
        (
            'should emit an error if a linted file has no ESLint instance',
            async () =>
            {
                const file = createVinylFile('file.js', '');
                file.eslint = { };
                await assert.rejects
                (
                    finishStream(gulpESLintNew.fix().end(file)),
                    {
                        constructor:    PluginError,
                        fileName:       file.path,
                        message:        'ESLint information not available',
                        plugin:         'gulp-eslint-new',
                        showStack:      false,
                    },
                );
            },
        );
    },
);
