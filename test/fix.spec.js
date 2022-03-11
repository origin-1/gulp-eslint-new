/* eslint-env mocha */

'use strict';

const { createVinylDirectory }  = require('./test-util');
const gulpESLintNew             = require('gulp-eslint-new');

describe('gulp-eslint-new fix', () => {

    it('should ignore files with null content', done => {
        const file = createVinylDirectory();
        gulpESLintNew.fix().on('finish', done).end(file);
    });

});
