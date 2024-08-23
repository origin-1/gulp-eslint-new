'use strict';

const { strict: assert }    = require('assert');
const { dirname }           = require('path');
const { promisify }         = require('util');

it
(
    'import from gulp-eslint-new',
    async () =>
    {
        const namespace = await import('gulp-eslint-new');
        const actual = Object.keys(namespace).sort();
        const expected =
        [
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
    },
);

// gulp-load-plugins uses the `resolve` package.
it
(
    'lookup with resolve',
    async () =>
    {
        const { default: resolve } = await import('resolve');
        const packageIterator = () => [dirname(__dirname)];
        const actual = await promisify(resolve)('gulp-eslint-new', { packageIterator });
        const expected = require.resolve('gulp-eslint-new');
        assert.strictEqual(actual, expected);
    },
);
