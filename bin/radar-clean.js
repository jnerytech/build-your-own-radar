#!/usr/bin/env node
'use strict'

process.argv.splice(2, 0, '--clean')
require('./radar-cli.js')
