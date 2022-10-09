import
gulpESLintNew,
{ FormatterContext, FormatterFunction, GulpESLintWriter, LoadedFormatter, ResultsMeta }
    from '../lib/gulp-eslint-new';
import { ESLint } from 'eslint';

gulpESLintNew(
    {
        configFile:         undefined,
        envs:               undefined,
        extends:            undefined,
        globals:            undefined,
        ignorePattern:      undefined,
        parser:             undefined,
        parserOptions:      undefined,
        plugins:            undefined,
        quiet:              undefined,
        rules:              undefined,
        warnFileIgnored:    undefined,
        warnIgnored:        undefined,
    },
);

// @ts-expect-error Invalid option.
gulpESLintNew({ cache: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ cacheLocation: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ cacheStrategy: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ errorOnUnmatchedPattern: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ extensions: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ globInputPaths: undefined });

const isStream = (stream: NodeJS.ReadWriteStream) => void stream;

isStream(gulpESLintNew.result(() => undefined));
gulpESLintNew.result(result => void result);
gulpESLintNew.result((result, callback) => callback());
// @ts-expect-error No arguments.
gulpESLintNew.result();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.result((result, callback, foo) => foo);

isStream(gulpESLintNew.results(() => undefined));
gulpESLintNew.results(results => void results);
gulpESLintNew.results((results, callback) => callback());
// @ts-expect-error No arguments.
gulpESLintNew.results();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.results((results, callback, foo) => foo);

isStream(gulpESLintNew.failOnError());

isStream(gulpESLintNew.failAfterError());

const formatterFunction =
    (results: ESLint.LintResult[], context?: FormatterContext) =>
        JSON.stringify({ results, context });
const invalidLoadedFormatter = {
    format: async (results: readonly ESLint.LintResult[], ignored: boolean) =>
        JSON.stringify({ results, ignored }),
};
const loadedFormatter = {
    format: async (results: readonly ESLint.LintResult[], resultsMeta: ResultsMeta) =>
        JSON.stringify({ results, resultsMeta }),
};

isStream(gulpESLintNew.formatEach());
gulpESLintNew.formatEach('test');
gulpESLintNew.formatEach({ format: () => 'test' });
gulpESLintNew.formatEach(loadedFormatter);
gulpESLintNew.formatEach(() => 'test');
gulpESLintNew.formatEach(formatterFunction);
(formatter?: string | LoadedFormatter | FormatterFunction) =>
    gulpESLintNew.formatEach(formatter);
(writer: NodeJS.WritableStream | GulpESLintWriter | undefined) =>
    gulpESLintNew.formatEach(undefined, writer);
// @ts-expect-error Invalid argument type.
gulpESLintNew.formatEach({ });
// @ts-expect-error Invalid argument type.
gulpESLintNew.formatEach(invalidLoadedFormatter);

isStream(gulpESLintNew.format());
gulpESLintNew.format('test');
gulpESLintNew.format({ format: () => 'test' });
gulpESLintNew.format(loadedFormatter);
gulpESLintNew.format(() => 'test');
gulpESLintNew.format(formatterFunction);
(formatter?: string | LoadedFormatter | FormatterFunction) =>
    gulpESLintNew.format(formatter);
(writer: NodeJS.WritableStream | GulpESLintWriter | undefined) =>
    gulpESLintNew.format(undefined, writer);
// @ts-expect-error Invalid argument type.
gulpESLintNew.format({ });
// @ts-expect-error Invalid argument type.
gulpESLintNew.format(invalidLoadedFormatter);

isStream(gulpESLintNew.fix());
