/* eslint-env mocha */

'use strict';

const { strict: assert } = require('assert');

it('import from gulp-eslint-new', async () => {
    const namespace = await import('gulp-eslint-new');
    const actual = Object.keys(namespace).sort();
    const expected = [
        'default',
        'failAfterError',
        'failOnError',
        'fix',
        'format',
        'formatEach',
        'result',
        'results',
    ];
    assert.deepEqual(actual, expected);
});
