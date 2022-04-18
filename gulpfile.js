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
        const { dirname, join } = require('path');
        const {
            createDiagnosticReporter,
            createProgram,
            getPreEmitDiagnostics,
            parseJsonConfigFileContent,
            readConfigFile,
            sys
        }
        = require('typescript');

        const pkgPath = __dirname;
        const tsConfigPath = join(pkgPath, 'test/tsconfig.json');
        const tsConfig = readConfigFile(tsConfigPath, sys.readFile);
        const basePath = dirname(tsConfigPath);
        const { fileNames, options } = parseJsonConfigFileContent(tsConfig.config, sys, basePath);
        const program = createProgram(fileNames, options);
        const diagnostics = getPreEmitDiagnostics(program);
        if (diagnostics.length) {
            const reporter = createDiagnosticReporter(sys, true);
            diagnostics.forEach(reporter);
            throw Error('TypeScript compilation failed');
        }
    }
);

task('default', series(parallel('clean', 'lint', 'ts-test'), 'test'));
