#!/usr/bin/env bash

tsc
ts-npm-lint --fix-typings
cat fallback.js.tpl >> index.js
echo "module.exports = require('./index').Plugin;" > plugin.js
mocha