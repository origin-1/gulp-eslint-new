/* eslint-env mocha */

'use strict';

const { GULP_DEST_KEY, createTransform }        = require('#util');
const { createVinylDirectory, createVinylFile } = require('./test-util');
const { strict: assert }                        = require('assert');
const gulpESLintNew                             = require('gulp-eslint-new');

describe('gulp-eslint-new fix', () => {

    it('should ignore files with null content', done => {
        const file = createVinylDirectory();
        gulpESLintNew.fix().on('finish', done).end(file);
    });

    it('should fix only a fixed file', done => {
        let actualDestArg;
        const actualFiles = [];
        const testStream =
        gulpESLintNew.fix(
            {
                [GULP_DEST_KEY]:
                destArg => {
                    actualDestArg = destArg;
                    return createTransform(
                        file => {
                            actualFiles.push(file);
                        },
                    );
                },
            },
        );
        const base = 'foobar';
        assert.equal(actualDestArg({ base }), base);
        const unfixedFile = createVinylFile('unfixed', 'unfixed');
        unfixedFile.eslint = { };
        const fixedFile = createVinylFile('fixed', 'fixed');
        fixedFile.eslint = { fixed: true };
        const ignoredFile = createVinylFile('ignored', 'ignored');
        const directory = createVinylDirectory();
        testStream.on('finish', () => {
            assert.deepEqual(actualFiles, [fixedFile]);
            done();
        });
        testStream.write(unfixedFile);
        testStream.write(fixedFile);
        testStream.write(ignoredFile);
        testStream.write(directory);
        testStream.end();
    });

});
