'use strict';

const { parallel, series, src, task } = require('gulp');

task(
	'clean',
	async () => {
		const { promises: { rm } } = require('fs');

		const options = { force: true, recursive: true };
		await rm('coverage', options);
	}
);

task(
	'lint',
	() => {
		const gulpESLintNew = require('.');

		const stream
		= src(['*.{js,ts}', 'example/*.js', 'test/**/*.{js,ts}'])
			.pipe(gulpESLintNew())
			.pipe(gulpESLintNew.format())
			.pipe(gulpESLintNew.failAfterError());
		return stream;
	}
);

task(
	'test',
	callback => {
		const { fork } = require('child_process');

		const { resolve } = require;
		const c8Path = resolve('c8/bin/c8');
		const mochaPath = resolve('mocha/bin/mocha');
		const childProcess
		= fork(
			c8Path,
			[
				'--reporter=html',
				'--reporter=text-summary',
				mochaPath,
				'--check-leaks',
				'test/*.spec.js'
			]
		);
		childProcess.on('exit', code => callback(code && 'Test failed'));
	}
);

task('default', series(parallel('clean', 'lint'), 'test'));
