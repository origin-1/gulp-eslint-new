'use strict';

module.exports =
(...args) =>
new Promise
(
    resolve =>
    {
        setImmediate(() => resolve(JSON.stringify(args)));
    },
);
