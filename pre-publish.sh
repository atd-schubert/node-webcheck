#!/usr/bin/env bash

tsc
ts-npm-lint --fix-typings
cat fallback.js.tpl >> index.js
mocha