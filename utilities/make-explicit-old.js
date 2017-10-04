"use strict";
const fs = require('fs');
const codegen = require('shift-codegen');
const FormattedCodeGen = codegen.FormattedCodeGen, Seq = codegen.Seq, Empty = codegen.Empty, Paren = codegen.Paren;
const parser = require('shift-parser');

function usage() {
  var path = require('path');
  var scriptName = path.basename(__filename);
  console.log(`Usage: node ${scriptName} filename

"filename" should be the name of a file and must end in .module.js or .script.js.
`);
  process.exit(1);
}

if (process.argv.length !== 3 || !process.argv[2].match(/(.module.js|.script.js)$/)) {
  usage();
}

const f = process.argv[2];


const s = fs.readFileSync(f, 'utf8');
const t = parser[f.match('module') ? 'parseModule' : 'parseScript'](s);
const e = codegen.default(t, new ExplicitCodeGen);
process.stdout.write(e);

