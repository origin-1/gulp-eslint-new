/* eslint-env mocha */

'use strict';

const util          = require('./test-util');
const gulpESLintNew = require('gulp-eslint-new');

describe('gulp-eslint-new fix', () => {

	it('should ignore files with null content', done => {
		const file = util.createVinylDirectory();
		gulpESLintNew.fix().on('finish', done).end(file);
	});

});
