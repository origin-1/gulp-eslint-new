# gulp-eslint-new · [![npm version][npm badge]][npm URL]

> A [gulp](https://gulpjs.com/) plugin to lint code with [ESLint](https://eslint.org/) 8

## Installation

Make sure that you are using a version of Node.js [supported by ESLint 8](https://eslint.org/docs/user-guide/getting-started#prerequisites).
For TypeScript support, you need TypeScript 4.2 or later.

To install gulp-eslint-new, [use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/about-npm):

```console
npm i -D gulp-eslint-new
```

gulp-eslint-new will also install the latest version of ESLint 8, unless another one is found.
To use a particular version of ESLint 8, install it by yourself.
For example, to use ESLint 8.8.0:

```console
npm i -D gulp-eslint-new eslint@8.8.0
```

## Migrating

If you are migrating from [gulp-eslint][gulp-eslint], you probably won't need to change any settings in your gulp task.
gulp-eslint-new can handle most of the options used with gulp-eslint, although some of them are now deprecated in favor of a new name or format.

Anyway, since gulp-eslint-new uses ESLint 8 while gulp-eslint sticks to ESLint 6, you may need to make some changes to your project to address incompatibilities between the versions of ESLint.
You can find more information at the links below.
* [Breaking changes for users from ESLint 6 to ESLint 7](https://eslint.org/docs/user-guide/migrating-to-7.0.0#breaking-changes-for-users)
* [Breaking changes for users from ESLint 7 to ESLint 8](https://eslint.org/docs/user-guide/migrating-to-8.0.0#breaking-changes-for-users)

## Usage

```javascript
const { src } = require('gulp');
const gulpESLintNew = require('gulp-eslint-new');

// Define the default gulp task.
exports.default =
() =>
src(['scripts/*.js'])                   // Read files.
.pipe(gulpESLintNew({ fix: true }))     // Lint files, create fixes.
.pipe(gulpESLintNew.fix())              // Fix files if necessary.
.pipe(gulpESLintNew.format())           // Output lint results to the console.
.pipe(gulpESLintNew.failAfterError());  // Exit with an error if problems are found.
```

Or use the plugin API to do things like:

```javascript
gulp.src(['**/*.js', '!node_modules/**'])
.pipe
(
    gulpESLintNew
    (
        {
            overrideConfig:
            {
                env:        { browser: true, commonjs: true, jquery: true },
                extends:    ['eslint:recommended', 'plugin:jquery/slim'],
                globals:    { chrome: 'readonly' },
                plugins:    ['jquery'],
                rules:      { 'strict': 'error' },
            },
            warnIgnored: true,
        },
    ),
)
.pipe(gulpESLintNew.formatEach('compact', process.stderr));
```

For additional examples, look through the [example directory](https://github.com/origin-1/gulp-eslint-new/tree/main/example).

## API

### `gulpESLintNew()`

Run ESLint with default settings. A [configuration file](https://eslint.org/docs/user-guide/configure/configuration-files) may be resolved relative to each linted file.

### `gulpESLintNew(options)`

Param type: `Record<string, unknown>`

Run ESLint with the specified options.
All supported options are listed below.
See the linked content for details about each option.

**General options**
* [`configType`](#optionsconfigtype)
* [`cwd`](#optionscwd)

**File enumeration options**
* [`ignore`](#optionsignore)
* [`ignorePath`](#optionsignorepath) (not in flat config)
* [`ignorePatterns`](#optionsignorepatterns) (flat config only)

**Linting options**
* [`allowInlineConfig`][linting options]
* [`baseConfig`][linting options]
* [`overrideConfig`][linting options]
* [`overrideConfigFile`][linting options]
* [`plugins`][linting options]
* [`reportUnusedDisableDirectives`][linting options]
* [`resolvePluginsRelativeTo`][linting options] (not in flat config)
* [`rulePaths`][linting options] (not in flat config)
* [`useEslintrc`][linting options] (not in flat config)

**Autofix options**
* [`fix`](#optionsfix)
* [`fixTypes`](#optionsfixtypes)

**Reporting options**
* [`quiet`](#optionsquiet)
* [`warnIgnored`](#optionswarnignored)

#### General Options

##### `options.configType`

Type: `"eslintrc" | "flat" | null`

Newer versions of ESLint introduce a [new type of configuration](https://eslint.org/docs/user-guide/configuring/configuration-files-new) based on file `eslint.config.js`.
Starting with gulp-eslint-new 1.7 it is possible to use the new configuration by setting the option `configType` to `"flat"`.

When using the new configuration, the options `ignorePath`, `resolvePluginsRelativeTo`, `rulePaths` and `useEslintrc` are no longer supported.
Support for the option `reportUnusedDisableDirectives` is removed in ESLint 8.56.
[Legacy options](#legacy-options) are not supported either and will not be mapped to new options.
Also, `ignorePatterns` is supported as a new top-level option, while other options like `baseConfig`, `overrideConfig` and `overrideConfigFile` accept different values.
Refer to [the official documentation](https://eslint.org/docs/user-guide/configuring/configuration-files-new) for a description of all differences from the standard configuration.

##### `options.cwd`

Type: `string`

The working directory. This must be an absolute path. Default is the current working directory.

The working directory is where ESLint will look for a `.eslintignore` file by default.
It is also the base directory for any relative paths specified in the options (e.g. `overrideConfigFile`, `resolvePluginsRelativeTo`, `rulePaths`, `overrideConfig.extends`, etc.).
The location of the files to be linted is not related to the working directory.

#### File Enumeration Options

##### `options.ignore`

Type: `boolean`

When `false`, ESLint will not respect `.eslintignore` files or ignore patterns in your configurations.

##### `options.ignorePath`

Type: `string`

The path to a file ESLint uses instead of `.eslintignore` in the current working directory.
This option in not available when [`configType`](#optionsconfigtype) is `"flat"`.

##### `options.ignorePatterns`

Type: `string[] | null`

Ignore file patterns to use in addition to config ignores.
This option in only available when [`configType`](#optionsconfigtype) is `"flat"`.

#### Autofix Options

##### `options.fix`

Type: `boolean | (message: LintMessage) => boolean`

Set to `true` or a function to generate fixes when possible, or set to `false` to explicitly disable autofixing.
If a predicate function is present, it will be invoked once for each lint message, and only the lint messages for which the function returned `true` will be reported.

**See the [Autofix](#autofix) section for more information and examples.**

##### `options.fixTypes`

Type: `("directive" | "problem" | "suggestion" | "layout")[] | null`

The types of fixes to apply. Default is all types.

#### Reporting Options

##### `options.quiet`

Type: `boolean`

When `true`, this option will filter warning messages from ESLint results. This mimics the ESLint CLI [`--quiet` option](https://eslint.org/docs/user-guide/command-line-interface#--quiet).

Type: `(message: string, index: number, list: Object[]) => unknown`

When a function is provided, it will be used to filter ESLint result messages, removing any messages that do not return a `true` (or truthy) value.

##### `options.warnIgnored`

Type: `boolean`

When `true`, add a result warning when ESLint ignores a file. Default is `false`.

This can be used to find files that are needlessly being loaded by `gulp.src`.
For example, since ESLint automatically ignores file paths inside a `node_modules` directory but `gulp.src` does not, a gulp task may take seconds longer just reading files from `node_modules`.

#### Legacy Options

The following legacy options are provided for backward compatibility with [gulp-eslint][gulp-eslint].
Some of them used to be available as top-level options previously, but in current versions of ESLint, they must be specified as child properties of a `baseConfig` or `overrideConfig` object.
When `gulpESLintNew` is passed any legacy options, it will map them automatically as shown in the table to match the new conventions.

| Legacy option     | Migrated to                     | Notes |
|-------------------|---------------------------------|-|
| `configFile`      | `overrideConfigFile`            | New option name. |
| `envs`            | `overrideConfig.env`            | New option name and format. `overrideConfig.env` should be an object as explained in the [documentation](https://eslint.org/docs/user-guide/configuring/language-options#specifying-environments). |
| `extends`         | `overrideConfig.extends`        | |
| `globals`         | `overrideConfig.globals`        | The new option format requires `overrideConfig.globals` to be an object as explained in the [documentation](https://eslint.org/docs/user-guide/configuring/language-options#specifying-globals). |
| `ignorePattern`   | `overrideConfig.ignorePatterns` | New option name. |
| `parser`          | `overrideConfig.parser`         | |
| `parserOptions`   | `overrideConfig.parserOptions`  | |
| `plugins`         | `overrideConfig.plugins`        | `plugins` as an array of strings is migrated to `overrideConfig.plugins`. By contrast, `plugins` as an object that maps strings to plugin implementations has different semantics and is not migrated. |
| `rules`           | `overrideConfig.rules`          | |
| `warnFileIgnored` | `warnIgnored`                   | New option name. |

If any legacy options are used, `gulpESLintNew` will print a warning.
To remove the warning, replace the legacy options used in your gulp task with the new options.

### `gulpESLintNew(overrideConfigFile)`

Param type: `string`

Shorthand for defining `options.overrideConfigFile`.

### `gulpESLintNew.result(action)`

Param type: `(result: Object) => void`

Call a function for each ESLint file result. No returned value is expected. If an error is thrown, it will be wrapped in a gulp `PluginError` and emitted from the stream.

```javascript
gulp.src(['**/*.js', '!node_modules/**'])
.pipe(gulpESLintNew())
.pipe
(
    gulpESLintNew.result
    (
        result =>
        {
            // Called for each ESLint result.
            console.log(`ESLint result: ${result.filePath}`);
            console.log(`# Messages: ${result.messages.length}`);
            console.log
            (
                `# Warnings: ${result.warningCount} (${
                result.fixableWarningCount} fixable)`,
            );
            console.log
            (
                `# Errors: ${result.errorCount} (${
                result.fixableErrorCount} fixable, ${
                result.fatalErrorCount} fatal)`,
            );
        },
    ),
);
```

Param Type: `(result: Object, callback: Function) => void`

Call an asynchronous, Node-style callback-based function for each ESLint file result. The callback must be called for the stream to finish. If an error is passed to the callback, it will be wrapped in a gulp `PluginError` and emitted from the stream.

Param Type: `(result: Object) => Promise<void>`

Call an asynchronous, promise-based function for each ESLint file result. If the promise is rejected, the rejection reason will be wrapped in a gulp `PluginError` and emitted from the stream.

### `gulpESLintNew.results(action)`

Param type: `(results: Object[]) => void`

Call a function once for all ESLint file results before a stream finishes. No returned value is expected. If an error is thrown, it will be wrapped in a gulp `PluginError` and emitted from the stream.

The results list has additional properties that indicate the number of messages of a certain kind.

<table>
    <tr>
        <td><code>errorCount</code></td>
        <td>number of errors</td>
    </tr>
    <tr>
        <td><code>warningCount</code></td>
        <td>number of warnings</td>
    </tr>
    <tr>
        <td><code>fixableErrorCount</code></td>
        <td>number of fixable errors</td>
    </tr>
    <tr>
        <td><code>fixableWarningCount</code></td>
        <td>number of fixable warnings</td>
    </tr>
    <tr>
        <td><code>fatalErrorCount</code></td>
        <td>number of fatal errors</td>
    </tr>
</table>

```javascript
gulp.src(['**/*.js', '!node_modules/**'])
.pipe(gulpESLintNew())
.pipe
(
    gulpESLintNew.results
    (
        results =>
        {
            // Called once for all ESLint results.
            console.log(`Total Results: ${results.length}`);
            console.log
            (
                `Total Warnings: ${results.warningCount} (${
                results.fixableWarningCount} fixable)`,
            );
            console.log
            (
                `Total Errors: ${results.errorCount} (${
                results.fixableErrorCount} fixable, ${
                results.fatalErrorCount} fatal)`,
            );
        },
    ),
);
```

Param type: `(results: Object[], callback: Function) => void`

Call an asynchronous, Node-style callback-based function once for all ESLint file results before a stream finishes. The callback must be called for the stream to finish. If an error is passed to the callback, it will be wrapped in a gulp `PluginError` and emitted from the stream.

Param type: `(results: Object[]) => Promise<void>`

Call an asynchronous, promise-based function once for all ESLint file results before a stream finishes. If the promise is rejected, the rejection reason will be wrapped in a gulp `PluginError` and emitted from the stream.

### `gulpESLintNew.failOnError()`

Stop a task/stream if an ESLint error has been reported for any file.

```javascript
// Cause the stream to stop (fail) without processing more files.
gulp.src(['**/*.js', '!node_modules/**'])
.pipe(gulpESLintNew())
.pipe(gulpESLintNew.failOnError());
```

### `gulpESLintNew.failAfterError()`

Stop a task/stream if an ESLint error has been reported for any file, but wait for all of them to be processed first.

```javascript
// Cause the stream to stop (fail) when the stream ends if any ESLint error(s)
// occurred.
gulp.src(['**/*.js', '!node_modules/**'])
.pipe(gulpESLintNew())
.pipe(gulpESLintNew.failAfterError());
```

### `gulpESLintNew.format(formatter, writer)`

`formatter` param type: `string | Object | Function | undefined`

`writer` param type: `NodeJS.WritableStream | Function | undefined`

Format all linted files once.
This should be used in the stream after piping through `gulpESLintNew`; otherwise, this will find no ESLint results to format.

The `formatter` argument determines the [ESLint formatter](https://eslint.org/docs/user-guide/formatters/) used to format linting results.
If a `string` is provided, a formatter module by that name or path will be resolved.
The resolved formatter will be either one of the built-in ESLint formatters, or a formatter exported by a module with the specified path (located relative to the ESLint working directory), or a formatter exported by a package installed as a dependency (the prefix "eslint-formatter-" in the package name can be omitted).
Instead of providing a string, it is also possible to specify a formatter object as resolved by the ESLint method [`loadFormatter`](https://eslint.org/docs/developer-guide/nodejs-api#-eslintloadformatternameorpath), or a formatter function directly.
If this argument is `undefined`, a modified version of the ESLint "stylish" formatter will be used.

```javascript
// Use the default gulp-eslint-new formatter.
gulpESLintNew.format()

// Use the "checkstyle" ESLint formatter.
gulpESLintNew.format('checkstyle')

// Use "eslint-formatter-pretty" as a formatter (must be installed with `npm`).
// See https://github.com/sindresorhus/eslint-formatter-pretty.
gulpESLintNew.format('pretty')
```

The `writer` argument may be a writable stream, `Function`, or `undefined`.
As a writable stream, the formatter output will be written to the stream.
If `undefined`, the formatter output will be written to [gulp's log](https://github.com/gulpjs/fancy-log#logmsg).
A `Function` will be called with the formatter output as the only parameter.

```javascript
// write to gulp's log (default)
gulpESLintNew.format()

// write messages to stdout
gulpESLintNew.format('junit', process.stdout)
```

### `gulpESLintNew.formatEach(formatter, writer)`

`formatter` param type: `string | Object | Function | undefined`

`writer` param type: `NodeJS.WritableStream | Function | undefined`

Format each linted file individually.
This should be used in the stream after piping through `gulpESLintNew`; otherwise, this will find no ESLint results to format.

The arguments for `gulpESLintNew.formatEach` are the same as the arguments for [`gulpESLintNew.format`](#gulpeslintnewformatformatter-writer).

### `gulpESLintNew.fix()`

Overwrite files with the fixed content provided by ESLint.
This should be used in conjunction with the option `fix` in [`gulpESLintNew(options)`](#gulpeslintnewoptions).
Files without a fix and files that were not processed by ESLint will be left untouched.

**See the [Autofix](#autofix) section for more information and examples.**

## Autofix

ESLint can fix some lint problems automatically: this function is called *autofix*.

To enable autofix with gulp-eslint-new, set the option `fix` to `true` in [`gulpESLintNew(options)`](#gulpeslintnewoptions), then pipe the stream to [`gulpESLintNew.fix()`](#gulpeslintnewfix), e.g.

```javascript
gulp.src(['**/*.{js,ts}', '!node_modules/**'])
.pipe(gulpESLintNew({ fix: true }))
.pipe(gulpESLintNew.fix());
```

See also the [autofix examples](https://github.com/origin-1/gulp-eslint-new/blob/main/example/fix.js).

The `fix` option applies fixes to the gulp stream.
`gulpESLintNew.fix()` saves the fixed content to file.
Rules that are fixable can be found in ESLint's [rules list](https://eslint.org/docs/rules/).
When fixes are applied, a `fixed` property is set to `true` on the fixed file's ESLint result.

## Custom Extensions

ESLint results are attached as an `eslint` property to the Vinyl files that pass through a gulp stream pipeline.
This is available to streams that follow the initial gulp-eslint-new stream.
The functions [`gulpESLintNew.result`](#gulpeslintnewresultaction) and [`gulpESLintNew.results`](#gulpeslintnewresultsaction) are made available to support extensions and custom handling of ESLint results.

[gulp-eslint]: https://github.com/adametry/gulp-eslint
[linting options]: https://eslint.org/docs/developer-guide/nodejs-api#linting
[npm badge]: https://img.shields.io/npm/v/gulp-eslint-new?logo=npm
[npm URL]: https://www.npmjs.com/package/gulp-eslint-new
