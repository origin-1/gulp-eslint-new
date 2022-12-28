'use strict';

const { createConfig } = require('@origin-1/eslint-config');

const config =
createConfig
(
    {
        files:      '*.js',
        jsVersion:  2020,
    },
    {
        files:          '*.ts',
        tsVersion:      'latest',
        parserOptions:  { project: 'tsconfig.json' },
        plugins:        ['tsdoc'],
        rules:          { 'tsdoc/syntax': 'error' },
    },
    {
        files:      ['*.js', '*.ts'],
        env:        { node: true },
        extends:    'plugin:eslint-comments/recommended',
        rules:
        {
            'no-throw-literal': 'off',
            'padded-blocks':    'off',
        },
    },
);

config.ignorePatterns = ['/coverage', '/example/demo'];

module.exports = config;
