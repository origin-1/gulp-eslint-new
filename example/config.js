'use strict';

// npm install gulp gulp-eslint-new

const eslint = require('..');
const { series, src } = require('gulp');

/**
 * Simple example of using ESLint and a formatter.
 * Note: ESLint does not write to the console itself.
 * Use format or formatEach to print ESLint results.
 * @returns {stream} gulp file stream
 */
function basic() {
	return src('../test/fixtures/**/*.js')
		// default: use local linting config.
		.pipe(eslint())
		// Format ESLint results and print them to the console.
		.pipe(eslint.format());
}

/**
 * Inline ESLint configuration.
 * @returns {stream} gulp file stream
 */
function inlineConfig() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint({
			rules: {
				'no-alert': 0,
				'no-bitwise': 0,
				'camelcase': 1,
				'curly': 1,
				'eqeqeq': 0,
				'no-eq-null': 0,
				'guard-for-in': 1,
				'no-empty': 1,
				'no-use-before-define': 0,
				'no-obj-calls': 2,
				'no-unused-vars': 0,
				'new-cap': 1,
				'no-shadow': 0,
				'strict': 2,
				'no-invalid-regexp': 2,
				'comma-dangle': 2,
				'no-undef': 1,
				'no-new': 1,
				'no-extra-semi': 1,
				'no-debugger': 2,
				'no-caller': 1,
				'semi': 1,
				'quotes': 0,
				'no-unreachable': 2
			},

			globals: ['$'],

			envs: ['node']
		}))
		.pipe(eslint.format());
}

/**
 * Load configuration file.
 * @returns {stream} gulp file stream
 */
function loadConfig() {
	return src('../test/fixtures/**/*.js')
		.pipe(eslint({
			// Load a specific ESLint config.
			overrideConfigFile: 'config.json'
		}))
		.pipe(eslint.format());
}

/**
 * Shorthand way to load a configuration file.
 * @returns {stream} gulp file stream
 */
function loadConfigShorthand() {
	return src('../test/fixtures/**/*.js')
		// Load a specific ESLint config
		.pipe(eslint('config.json'))
		.pipe(eslint.format());
}

/**
 * The default task will run all above tasks.
 */
module.exports = {
	'default': series(
		basic,
		inlineConfig,
		loadConfig,
		loadConfigShorthand,
		async () => {
			console.log('All tasks completed successfully.');
		}
	),
	'basic': basic,
	'inline-config': inlineConfig,
	'load-config': loadConfig,
	'load-config-shorthand': loadConfigShorthand
};
