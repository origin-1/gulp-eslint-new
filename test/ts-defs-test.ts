import
gulpESLintNew,
{
    type FormatterContext,
    type FormatterFunction,
    type GulpESLintResult,
    type GulpESLintResults,
    type GulpESLintWriter,
    type LoadedFormatter,
    type ResultsMeta,
    type Severity,
}
from '../lib/gulp-eslint-new';
import type { ESLint }  from 'eslint';

gulpESLintNew
(
    {
        baseConfig:                     null,
        fixTypes:                       null,
        flags:                          undefined,
        overrideConfig:                 null,
        overrideConfigFile:             null,
        plugins:                        null,
        reportUnusedDisableDirectives:  null,
    },
);

{
    let configType!: undefined | null;
    gulpESLintNew
    ({ configType, ignorePatterns: undefined, ruleFilter: undefined, stats: undefined });
}

{
    let configType!: undefined | null;
    gulpESLintNew
    (
        {
            configType,
            reportUnusedDisableDirectives:  undefined,
            resolvePluginsRelativeTo:       undefined,
            rulePaths:                      undefined,
        },
    );
}

gulpESLintNew
(
    {
        configType:                     'eslintrc',
        allowInlineConfig:              false,
        baseConfig:                     { rules: { } },
        cwd:                            'cwd',
        fix:                            true,
        fixTypes:                       ['problem'],
        flags:                          ['flag'],
        ignore:                         false,
        overrideConfig:                 { env: { } },
        overrideConfigFile:             'overrideConfigFile',
        plugins:                        { foo: { } },
        quiet:                          true,
        reportUnusedDisableDirectives:  'off',
        resolvePluginsRelativeTo:       'resolvePluginsRelativeTo',
        rulePaths:                      ['rulePaths'],
        warnIgnored:                    true,
    },
);

gulpESLintNew
(
    {
        configType:         'flat',
        allowInlineConfig:  false,
        baseConfig:         { rules: { } },
        cwd:                'cwd',
        fix:                true,
        fixTypes:           ['problem'],
        flags:              ['flag'],
        ignore:             false,
        ignorePatterns:     ['ignored.js'],
        overrideConfig:
        [
            'eslint:recommended',
            { files: ['1/*.js', '2/*.js'], ignores: ['1/_.js', '2/_.js'], processor: 'foo/bar' },
        ],
        overrideConfigFile: true,
        plugins:            { foo: { processors: { bar: { } } } },
        quiet:              true,
        ruleFilter:         ({ ruleId, severity }): ('' | Severity) => ruleId && severity,
        stats:              true,
        warnIgnored:        true,
    },
);

void
(
    (configType: 'eslintrc' | 'flat', ignorePatterns?: string[] | null, rulePaths?: string[]):
    NodeJS.ReadWriteStream =>
    gulpESLintNew
    (
        {
            configType,
            allowInlineConfig:          false,
            baseConfig:                 { rules: { } },
            flags:                      ['flag'],
            ignorePatterns,
            resolvePluginsRelativeTo:   'resolvePluginsRelativeTo',
            rulePaths,
        },
    )
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

// @ts-expect-error Invalid option for eslintrc config.
gulpESLintNew({ configType: 'eslintrc', ignorePatterns: [] });

// @ts-expect-error Invalid option type for eslintrc config.
gulpESLintNew({ configType: 'eslintrc', overrideConfigFile: true });

// @ts-expect-error Invalid option.
gulpESLintNew({ passOnNoPatterns: undefined });

// @ts-expect-error Invalid option for flat config.
gulpESLintNew({ configType: 'flat', reportUnusedDisableDirectives: undefined });

// @ts-expect-error Invalid option for eslintrc config.
gulpESLintNew({ configType: 'eslintrc', ruleFilter: undefined });

// @ts-expect-error Invalid option.
gulpESLintNew({ rules: undefined });

// @ts-expect-error Invalid option for eslintrc config.
gulpESLintNew({ configType: 'eslintrc', stats: undefined });

const isStream = (stream: NodeJS.ReadWriteStream): void => void stream;

isStream(gulpESLintNew.result((): undefined => undefined));
gulpESLintNew.result((result): void => void result);
gulpESLintNew.result((result, callback): void => callback());
// @ts-expect-error No arguments.
gulpESLintNew.result();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.result((result, callback, foo: unknown): unknown => foo);
void
(
    (
        action:
        | ((result: GulpESLintResult) => Promise<void>)
        | ((result: GulpESLintResult, callback: Function) => void),
    ):
    NodeJS.ReadWriteStream =>
    gulpESLintNew.result(action)
);

isStream(gulpESLintNew.results((): undefined => undefined));
gulpESLintNew.results((results): void => void results);
gulpESLintNew.results((results, callback): void => callback());
// @ts-expect-error No arguments.
gulpESLintNew.results();
// @ts-expect-error Too many arguments to callback.
gulpESLintNew.results((results, callback, foo: unknown): unknown => foo);
void
(
    (
        action:
        | ((results: GulpESLintResults) => Promise<void>)
        | ((results: GulpESLintResults, callback: Function) => void),
    ):
    NodeJS.ReadWriteStream =>
    gulpESLintNew.results(action)
);

isStream(gulpESLintNew.failOnError());

isStream(gulpESLintNew.failAfterError());

const formatterFunction =
(results: ESLint.LintResult[], context?: FormatterContext): string =>
JSON.stringify({ results, context });
declare const toStringAsync: (arg: unknown) => Promise<string>;
const invalidLoadedFormatter =
{
    format: async (results: readonly ESLint.LintResult[], ignored: boolean):
    Promise<string> => toStringAsync({ results, ignored }),
};
const loadedFormatter =
{
    format: async (results: readonly ESLint.LintResult[], resultsMeta: ResultsMeta):
    Promise<string> => toStringAsync({ results, resultsMeta }),
};

isStream(gulpESLintNew.formatEach());
gulpESLintNew.formatEach('test');
gulpESLintNew.formatEach({ format: (): string => 'test' });
gulpESLintNew.formatEach(loadedFormatter);
gulpESLintNew.formatEach((): string => 'test');
gulpESLintNew.formatEach(formatterFunction);

void
(
    (formatter?: string | LoadedFormatter | FormatterFunction): NodeJS.ReadWriteStream =>
    gulpESLintNew.formatEach(formatter)
);

void
(
    (writer: NodeJS.WritableStream | GulpESLintWriter | undefined): NodeJS.ReadWriteStream =>
    gulpESLintNew.formatEach(undefined, writer)
);

// @ts-expect-error Invalid argument type.
gulpESLintNew.formatEach({ });
// @ts-expect-error Invalid argument type.
gulpESLintNew.formatEach(invalidLoadedFormatter);

isStream(gulpESLintNew.format());
gulpESLintNew.format('test');
gulpESLintNew.format({ format: (): string => 'test' });
gulpESLintNew.format(loadedFormatter);
gulpESLintNew.format((): string => 'test');
gulpESLintNew.format(formatterFunction);

void
(
    (formatter?: string | LoadedFormatter | FormatterFunction): NodeJS.ReadWriteStream =>
    gulpESLintNew.format(formatter)
);

void
(
    (writer: NodeJS.WritableStream | GulpESLintWriter | undefined): NodeJS.ReadWriteStream =>
    gulpESLintNew.format(undefined, writer)
);

// @ts-expect-error Invalid argument type.
gulpESLintNew.format({ });
// @ts-expect-error Invalid argument type.
gulpESLintNew.format(invalidLoadedFormatter);

isStream(gulpESLintNew.fix());
