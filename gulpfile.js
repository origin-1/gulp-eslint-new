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
        const gulpESLintNew = require('gulp-eslint-new');

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

task(
    'ts-test',
    async () => {
        const { join }  = require('path');
        const { createDiagnosticReporter, createProgram, getPreEmitDiagnostics, sys }
        = require('typescript');

        const pkgPath = __dirname;
        const fileName = join(pkgPath, 'test/ts-defs-test.ts');
        const program = createProgram([fileName], { strict: true });
        const diagnostics = getPreEmitDiagnostics(program);
        if (diagnostics.length) {
            const reporter = createDiagnosticReporter(sys, true);
            diagnostics.forEach(reporter);
            throw Error('TypeScript compilation failed');
        }
    }
);

task('default', series(parallel('clean', 'lint', 'ts-test'), 'test'));
