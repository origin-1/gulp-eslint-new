# gulp-eslint-new · [![npm version][npm badge]][npm URL]

> A [gulp](https://gulpjs.com/) plugin to lint code with [ESLint](https://eslint.org/) 8

## Installation

[Use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/about-npm):

```console
npm i -D gulp-eslint-new
```

## Migrating

If you are migrating from gulp-eslint, you probably won't need to change any settings in your Gulp task.
gulp-eslint-new can handle most of the options used with gulp-eslint, although some of them are now deprecated in favor of a new name or format.

Anyway, since gulp-eslint-new uses ESLint 8 while gulp-eslint sticks to ESLint 6, you may need to make some changes to your project to address incompatibilities between the versions of ESLint.
You can find more information at the links below.
* [Breaking changes for users from ESLint 6 to ESLint 7](https://eslint.org/docs/user-guide/migrating-to-7.0.0#breaking-changes-for-users)
* [Breaking changes for users from ESLint 7 to ESLint 8](https://eslint.org/docs/user-guide/migrating-to-8.0.0#breaking-changes-for-users)

## Usage

```javascript
const { src } = require('gulp');
const eslint = require('gulp-eslint-new');

// Define the default gulp task.
exports.default =
    () => src(['scripts/*.js'])
    // eslint() attaches the lint output to the "eslint" property of
    // the file object so it can be used by other modules.
    .pipe(eslint())
    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see docs).
    .pipe(eslint.format())
    // To have the process exit with an error code (1) on lint error,
    // return the stream and pipe to failAfterError last.
    .pipe(eslint.failAfterError());
```

Or use the plugin API to do things like:

```javascript
gulp.src(['**/*.js', '!node_modules/**'])
    .pipe(eslint({
        overrideConfig: {
            rules: {
                'my-custom-rule': 1,
                'strict': 2
            },
            globals: {
                jQuery: 'readonly',
                $: 'readonly'
            },
            env: {
                'browser': true
            }
        }
    }))
    .pipe(eslint.formatEach('compact', process.stderr));
```

For additional examples, look through the [example directory](https://github.com/fasttime/gulp-eslint-new/tree/main/example).

## API

### `eslint()`

*No explicit configuration.* A `.eslintrc` file may be resolved relative to each linted file.

### `eslint(options)`

Param type: `Object`

Supported options include all [linting options](https://eslint.org/docs/developer-guide/nodejs-api#linting) and [autofix options](https://eslint.org/docs/developer-guide/nodejs-api#autofix) of the `ESLint` constructor.
Please, refer to the ESLint documentation for information about the usage of those options.
Check also the notes about the [Autofix Function](#autofix-function).
Additionally, gulp-eslint-new supports the options listed below.

#### Additional Options

##### `options.cwd`

Type: `string`

The working directory. This must be an absolute path. Default is the current working directory.

The working directory is where ESLint will look for a `.eslintignore` file by default.
It is also the base directory for any relative paths specified in the options (e.g. `options.overrideConfigFile`, `options.resolvePluginsRelativeTo`, `options.rulePaths`, `options.overrideConfig.extends`, etc.).
The location of the files to be linted is not related to the working directory.

##### `options.ignore`

Type: `boolean`

When `false`, .eslintignore files or ignore patterns in your configurations will not be respected.

##### `options.ignorePath`

Type: `string | null`

The path to a file ESLint uses instead of `.eslintignore` in the current working directory.

##### `options.quiet`

Type: `boolean`

When `true`, this option will filter warning messages from ESLint results. This mimics the ESLint CLI [`--quiet` option](https://eslint.org/docs/user-guide/command-line-interface#--quiet).

Type: `(message, index, list) => boolean`

When a function is provided, it will be used to filter ESLint result messages, removing any messages that do not return a `true` (or truthy) value.

##### `options.warnIgnored`

Type: `boolean`

When `true`, add a result warning when ESLint ignores a file. This can be used to find files that are needlessly being loaded by `gulp.src`. For example, since ESLint automatically ignores "node_modules" file paths and `gulp.src` does not, a gulp task may take seconds longer just reading files from the "node_modules" directory.

#### Legacy Options

The following options are provided for backward compatibility with [gulp-eslint](https://github.com/adametry/gulp-eslint).
Their usage is discouraged because preferable alternatives exist, that are more in line with the present ESLint conventions.

##### `options.configFile`

Type: `string`

_A legacy synonym for `options.overrideConfigFile`._

##### `options.envs`

Type: `string[]`

Specify a list of [environments](https://eslint.org/docs/user-guide/configuring/language-options#specifying-environments) to be applied.

_Prefer using `options.overrideConfig.env` instead. Note the different option name and format._

##### `options.globals`

Type: `string[]`

Specify [global variables](https://eslint.org/docs/user-guide/configuring/language-options#specifying-globals) to declare.

```javascript
{
    "globals": [
        "jQuery",
        "$"
    ]
}
```

_Prefer using `options.overrideConfig.globals` instead. Note the different format._

##### `options.parser`

Type: `string`

_Prefer using `options.overrideConfig.parser` instead._

##### `options.parserOptions`

Type: `Object`

_Prefer using `options.overrideConfig.parserOptions` instead._

##### `options.rules`

Type: `Object`

Set [configuration](https://eslint.org/docs/user-guide/configuring/rules#configuring-rules) of [rules](https://eslint.org/docs/rules/).

```javascript
{
    "rules": {
        "camelcase": 1,
        "comma-dangle": 2,
        "quotes": 0
    }
}
```

_Prefer using `options.overrideConfig.rules` instead._

##### `options.warnFileIgnored`

Type: `boolean`

_A legacy synonym for `options.warnIgnored`._

#### Autofix Function

When the `fix` option is specified, fixes are applied to the gulp stream.
The fixed content can be saved to file using `gulp.dest` (See [example/fix.js](https://github.com/fasttime/gulp-eslint-new/blob/main/example/fix.js)).
Rules that are fixable can be found in ESLint's [rules list](https://eslint.org/docs/rules/).
When fixes are applied, a "fixed" property is set to `true` on the fixed file's ESLint result.

### `eslint(overrideConfigFile)`

Param type: `string`

Shorthand for defining `options.overrideConfigFile`.

### `eslint.result(action)`

Param type: `(result) => void`

Call a function for each ESLint file result. No returned value is expected. If an error is thrown, it will be wrapped in a gulp `PluginError` and emitted from the stream.

```javascript
gulp.src(['**/*.js','!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.result(result => {
        // Called for each ESLint result.
        console.log(`ESLint result: ${result.filePath}`);
        console.log(`# Messages: ${result.messages.length}`);
        console.log(`# Warnings: ${result.warningCount} (${result.fixableWarningCount} fixable)`);
        console.log(`# Errors: ${result.errorCount} (${result.fixableErrorCount} fixable, ${
            result.fatalErrorCount} fatal)`);
    }));
```

Type: `(result, callback) => void`

Call an asynchronous, Node-style callback-based function for each ESLint file result. The callback must be called for the stream to finish. If an error is passed to the callback, it will be wrapped in a gulp `PluginError` and emitted from the stream.

Type: `result => Promise<void>`

Call an asynchronous, promise-based function for each ESLint file result. If the promise is rejected, the rejection reason will be wrapped in a gulp `PluginError` and emitted from the stream.

### `eslint.results(action)`

Param type: `(results) => void`

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
gulp.src(['**/*.js','!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.results(results => {
        // Called once for all ESLint results.
        console.log(`Total Results: ${results.length}`);
        console.log(`Total Warnings: ${results.warningCount} (${
            results.fixableWarningCount} fixable)`);
        console.log(`Total Errors: ${results.errorCount} (${results.fixableErrorCount} fixable, ${
            results.fatalErrorCount} fatal)`);
    }));
```

Param type: `(results, callback) => void`

Call an asynchronous, Node-style callback-based function once for all ESLint file results before a stream finishes. The callback must be called for the stream to finish. If an error is passed to the callback, it will be wrapped in a gulp `PluginError` and emitted from the stream.

Param type: `results => Promise<void>`

Call an asynchronous, promise-based function once for all ESLint file results before a stream finishes. If the promise is rejected, the rejection reason will be wrapped in a gulp `PluginError` and emitted from the stream.

### `eslint.failOnError()`

Stop a task/stream if an ESLint error has been reported for any file.

```javascript
// Cause the stream to stop (fail) before copying an invalid JS file to the output directory.
gulp.src(['**/*.js','!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.failOnError());
```

### `eslint.failAfterError()`

Stop a task/stream if an ESLint error has been reported for any file, but wait for all of them to be processed first.

```javascript
// Cause the stream to stop(/fail) when the stream ends if any ESLint error(s) occurred.
gulp.src(['**/*.js','!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.failAfterError());
```

### `eslint.format(formatter, output)`

Format all linted files once. This should be used in the stream after piping through `eslint`; otherwise, this will find no ESLint results to format.

The `formatter` argument may be a `string`, `Function`, or `undefined`. As a `string`, a formatter module by that name or path will be resolved as a module, relative to the current working directory, or as one of the [built-in ESLint formatters](https://eslint.org/docs/user-guide/formatters/#eslint-formatters). If `undefined`, the ESLint "stylish" formatter will be resolved. A `Function` will be called with an `Array` of file linting results to format.

```javascript
// use the default "stylish" ESLint formatter
eslint.format()

// use the "checkstyle" ESLint formatter
eslint.format('checkstyle')

// use the "eslint-path-formatter" module formatter
// (@see https://github.com/Bartvds/eslint-path-formatter)
eslint.format('node_modules/eslint-path-formatter')
```

The `output` argument may be a `WritableStream`, `Function`, or `undefined`. As a `WritableStream`, the formatter results will be written to the stream. If `undefined`, the formatter results will be written to [gulp's log](https://github.com/gulpjs/fancy-log#logmsg). A `Function` will be called with the formatter results as the only parameter.

```javascript
// write to gulp's log (default)
eslint.format();

// write messages to stdout
eslint.format('junit', process.stdout)
```

### `eslint.formatEach(formatter, output)`

Format each linted file individually. This should be used in the stream after piping through `eslint`; otherwise, this will find no ESLint results to format.

The arguments for `formatEach` are the same as the arguments for `format`.

## Configuration

ESLint may be configured explicity by using any of the supported [configuration options](https://eslint.org/docs/user-guide/configuring/). Unless the `useEslintrc` option is set to `false`, ESLint will attempt to resolve a file by the name of `.eslintrc` within the same directory as the file to be linted. If not found there, parent directories will be searched until `.eslintrc` is found or the directory root is reached.

## Custom Extensions

ESLint results are attached as an `eslint` property to the Vinyl files that pass through a gulp stream pipeline. This is available to streams that follow the initial gulp-eslint-new stream. The [`eslint.result`](#eslintresultaction) and [`eslint.results`](#eslintresultsaction) methods are made available to support extensions and custom handling of ESLint results.

### Extension Packages

* [gulp-eslint-if-fixed](https://github.com/lukeapage/gulp-eslint-if-fixed)
* [gulp-eslint-threshold](https://github.com/krmbkt/gulp-eslint-threshold)

[npm badge]: https://badge.fury.io/js/gulp-eslint-new.svg
[npm URL]: https://www.npmjs.com/package/gulp-eslint-new
