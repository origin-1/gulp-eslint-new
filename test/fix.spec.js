/* eslint-env mocha */

'use strict';

const { GULP_DEST_KEY, GULP_WARN_KEY, createTransform } = require('#util');
const { createVinylDirectory, createVinylFile }         = require('./test-util');
const { strict: assert }                                = require('assert');
const gulpESLintNew                                     = require('gulp-eslint-new');

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
                            ++warnCount;
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
    },
);
