const fs = require('fs');
const crypto = require('crypto');
const normalize = require('normalize-parser-test').default;

function slug(data) {
  let digest = crypto.createHash('sha256').update(data).digest('hex');
  return digest.substring(0, 16);
}

// TODO: rename should allow you to reassign type, not just name
function loadLicenses(str) {
  const lines = str.split('\n');
  let licenses = [];

  let pos = 0;

  let fileMap = new Map();

  function rename(name, newName) {
    if (!fileMap.has(name)) {
      throw new Error('Missing license information for file ' + name);
    }
    let obj = fileMap.get(name);
    obj.name = newName;
    fileMap.delete(name);
    fileMap.set(newName, obj);
  }

  function eatBlank() {
    if (lines[pos] !== '') {
      throw new Error('Expected blank line at line ' + pos);
    }
    ++pos;
  }

  function readHeading() {
    if (lines[pos].substring(0, 3) !== '## ') {
      throw new Error('Line ' + pos + ' does not appear to be a section heading');
    }
    return lines[pos++].substring(3);
  }

  function readLicense() {
    let out = '';
    while (pos < lines.length) {
      out += lines[pos];
      ++pos;
      if (lines[pos][0] !== '*') {
        out += '\n';
      } else {
        break;
      }
    }
    return out;
  }

  function readFileList() {
    let out = [];
    while (pos < lines.length && lines[pos][0] === '*') {
      let obj = {name: lines[pos].substring(2)};
      out.push(obj);
      fileMap.set(obj.name, obj);
      ++pos;
    }
    return out;
  }

  while (pos < lines.length) {
    let key = readHeading();
    eatBlank();
    let license = readLicense();
    let files = readFileList();
    eatBlank();
    licenses.push({
      key,
      license,
      files,
    });
  }

  return {licenses, rename};
}

function dumpLicenses(data) {
  let out = [];
  for (let {key, license, files} of data.sort((a, b) => (a.key < b.key ? -1 : 1))) {
    out.push('## ' + key);
    out.push('');
    out.push(license);
    out.push(...files.sort((a, b) => (a.name < b.name ? -1 : 1)).map(f => '* ' + f.name));
    out.push('');
  }
  return out.join('\n');
}

let {licenses, rename: licenseRename} = loadLicenses(fs.readFileSync('./licenses.md', 'utf8'));

// rename('pass/1955.script.js', 'aa');
// rename('aa', 'zz');

// console.log(dumpLicenses(licenses));

// returns a list of files which don't have the right name, in the form {dir, name, correctName}
function checkNames() {
  let out = [];
  for (let dir of ['pass', 'fail', 'early']) {
    for (let name of fs.readdirSync(dir)) {
      let isModule = !!name.match(/\.module\.js$/);
      if (!name.match(/\.js$/)) {
        continue;
      }
      let contents = fs.readFileSync(dir + '/' + name, 'utf8');
      let correctName = slug(contents) + (isModule ? '.module' : '') + '.js';
      if (name !== correctName) {
        out.push({dir, name, correctName});
      }
    }
  }

  return out;
}

// returns an object with two or three properties
// needExplicit: a list of files under pass which don't have a corresponding file under pass-explicit
// orphanedExplicit: a list of files under pass-explicit which don't have a corresponding file under pass
// wrongContents, the empty list if includingContents is false, otherwise a list of files whose pass-explicit is wrong, in the form {name, correctContents}
function checkExplicit({includingContents = false}) {
  let needExplicit = [];
  let orphanedExplicit = [];
  let wrongContents = [];
  for (let name of fs.readdirSync('pass')) {
    if (!fs.existsSync('pass-explicit/' + name)) {
      needExplicit.push(name);
    } else if (includingContents) {
      let contents = fs.readFileSync(dir + '/' + name, 'utf8');
      let correctContents = normalize(contents);
      if (contents !== correctContents) {
        wrongContents.push({name, correctContents});
      }
    }
  }

  for (let name of fs.readdirSync('pass-explicit')) {
    if (!fs.existsSync('pass-explicit/' + name)) {
      needExplicit.push(name);
    }
  }

  return {needExplicit, orphanedExplicit, wrongContents};
}

function internalMove({name, newName, dir, newDir = dir}) {
  // doesn't check slug itself; pass it the right one.
  // OTOH, does create and remove normalized copy, if appropriate
}
