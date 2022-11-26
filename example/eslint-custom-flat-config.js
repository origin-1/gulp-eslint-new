'use strict';

const globals = require('globals');

module.exports = [
    'eslint:recommended',
    {
        rules:              {
            'no-alert':     0,
            'no-bitwise':   0,
            'camelcase':    1,
            'curly':        1,
            'eqeqeq':       0,
            'no-eq-null':   0,
            'guard-for-in': 1,
            'no-empty':     1,
            'strict':       2,
        },
        languageOptions:    {
            ecmaVersion:    5,
            globals:        { $: false, ...globals.browser, ...globals.node },
            parserOptions:  { ecmaFeatures: { globalReturn: true } },
            sourceType:     'script',
        },
    },
];
