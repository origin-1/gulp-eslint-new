import gulpESLintNew from '..';

gulpESLintNew.result(result => void result);
gulpESLintNew.result((result, callback) => callback());
// @ts-expect-error Too many arguments.
gulpESLintNew.result((result, callback, foo) => foo);
((stream: NodeJS.ReadWriteStream) => stream)(gulpESLintNew.result(() => undefined));

gulpESLintNew.results(results => void results);
gulpESLintNew.results((results, callback) => callback());
// @ts-expect-error Too many arguments.
gulpESLintNew.results((results, callback, foo) => foo);
((stream: NodeJS.ReadWriteStream) => stream)(gulpESLintNew.results(() => undefined));
