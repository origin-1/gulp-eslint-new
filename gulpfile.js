'use strict';

const { parallel, series, src, task } = require('gulp');

task
(
	'clean',
	async() => {
		const { promises: { rm } } = require('fs');

		const options = { force: true, recursive: true };
		await rm('coverage', options);
	}
);

task
(
	'lint',
	() => {
		const gulpESLint = require('.');

		const stream
		= src(['*.js', 'example/**/*.js', 'test/**/*.js', '!test/fixtures/**'])
			.pipe(gulpESLint())
			.pipe(gulpESLint.format())
			.pipe(gulpESLint.failAfterError());
		return stream;
	}
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

task('default', series(parallel('clean', 'lint'), 'test'));
