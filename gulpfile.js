'use strict';

const eslint                = require('.');
const { series, src, task } = require('gulp');

task
(
	'lint',
	() =>
		src(['*.js', 'example/**/*.js', 'test/**/*.js', '!test/fixtures/**'])
			.pipe(eslint())
			.pipe(eslint.format())
			.pipe(eslint.failAfterError())
);

task
(
	'test',
	callback => {
		const { fork } = require('child_process');

		const { resolve } = require;
		const c8Path = resolve('c8/bin/c8');
		const mochaPath = resolve('mocha/bin/mocha');
		const childProcess
		= fork
		(c8Path, ['--reporter=html', '--reporter=text-summary', mochaPath, '--check-leaks']);
		childProcess.on('exit', code => callback(code && 'Test failed'));
	}
);

task('default', series('lint', 'test'));
