/*
commands:
  check, just makes sure things look roughly in order
  check-strict, also check that pass tests are normalized and pass-explicit are correct
  check-explicit: just checks that pass-explicit tests are correct
  check-normalized: just checks that pass tests are normalized
  fix: fixes whatever it can. confirms first.
  fix-force: as above, but does not ask for confirmation.
  add-license: takes a license and a list of files
  add-license-all: takes a license, adds it to all new files (after confirmation)
  mark: takes a file and a directory, marks it as that thing
*/



const fs = require('fs');
const crypto = require('crypto');
const normalize = require('normalize-parser-test').default;
const makeExplicit = require('./make-explicit');
const getLicenseInfo = require('./licenses');
const commandLineCommands = require('command-line-commands');
const commandLineUsage = require('command-line-usage');
const inquirer = require('inquirer');
const chalk = require('chalk');


const licenseFile = 'licenses.md';


function slug(data) {
  let digest = crypto.createHash('sha256').update(data).digest('hex');
  return digest.substring(0, 16);
}




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
function checkExplicit({includingContents}) {
  let needExplicit = [];
  let orphanedExplicit = [];
  let wrongContents = [];
  for (let name of fs.readdirSync('pass')) {
    if (!fs.existsSync('pass-explicit/' + name)) {
      needExplicit.push(name);
    } else if (includingContents) {
      try{

      let originalContents = fs.readFileSync('pass/' + name, 'utf8');
      let correctContents = makeExplicit(originalContents);
      let currentContents = fs.readFileSync('pass-explicit/' + name, 'utf8');
      if (currentContents !== correctContents) {
        wrongContents.push({name, correctContents});
      }

      } catch({}) {}
    }
  }

  for (let name of fs.readdirSync('pass-explicit')) {
    if (!fs.existsSync('pass-explicit/' + name)) {
      needExplicit.push(name);
    }
  }

  return {needExplicit, orphanedExplicit, wrongContents};
}


function renameActualFiles({name, newName, dir, newDir = dir}) {
  if (!fs.existsSync(dir + '/' + name)) {
    throw new Error('File doesn\'t exist');
  }

  if (fs.existsSync(newDir + '/' + newName)) {
    throw new Error(`Attempting to move "${dir + '/' + name}" to "${newDir + '/' + newName}", but destination file already exists`);
  }

  if (dir !== newDir) {
    if (dir === 'pass') {
      if (fs.existsSync('pass-explicit/' + name)) {
        fs.unlinkSync('pass-explicit/' + name);
      }
    } else if (newDir === 'pass') {
      if (fs.existsSync('pass-explicit/' + newName)) {
        throw new Error('Explicit version already exists');
      }
      let isModule = !!newName.match(/\.module\.js$/);
      let contents = fs.readFileSync(dir + '/' + name, 'utf8');
      let explicit = makeExplicit(contents, isModule);
      fs.writeFileSync('pass-explicit/' + newName, explicit, 'utf8');
    }
  } else if (dir === 'pass') {
    if (fs.existsSync('pass-explicit/' + newName)) {
      throw new Error('Explicit version already exists');
    }
    if (fs.existsSync('pass-explicit/' + name)) {
      fs.renameSync('pass-explicit/' + name, 'pass-explicit/' + newName);
    } else {
      let isModule = !!newName.match(/\.module\.js$/);
      let contents = fs.readFileSync(dir + '/' + name, 'utf8');
      let explicit = makeExplicit(contents, isModule);
      fs.writeFileSync('pass-explicit/' + newName, explicit, 'utf8');
    }
  }

  fs.renameSync(dir + '/' + name, newDir + '/' + newName);
}


function rename(licenseInfo, {name, newName = name, dir, newDir = dir}) {
  // doesn't validate names at all.
  // doesn't verify license info exists: do that yourself.
  // doesn't check slug itself; pass it the right one.
  // also doesn't normalize. do that yourself.
  // OTOH, does create and remove the pass-explicit copy, if appropriate.
  // throws if moving to pass and the pass-explicit copy exists.
  // also throws if the new name already exists.

  if (name === newName && dir === newDir) return;

  renameActualFiles({name, newName, dir, newDir});
  licenseInfo.rename(dir + '/' + name, newDir + '/' + newName);
}



function fixNames(licenseInfo) {
  let wrongNames = checkNames();
  for (let {dir, name, correctName} of wrongNames) {
    rename(licenseInfo, {name, newName: correctName, dir});
  }
}







function markCommand(type, files) {
  if (type !== 'pass' && type !== 'fail' && type !== 'early') {
    throw new Error('Type must be one of pass, fail, or early');
  }

  let splitFiles = files.map(f => f.split('/'));
  let dumbFiles = splitFiles.filter(p => p.length !== 2 || ['pass', 'fail', 'early'].indexOf(p[0]) === -1);
  if (dumbFiles.length > 0) {
    throw new Error('Files outside of managed directories:\n' + dumbFiles.map(f => ' - ' + f).join('\n'));
  }

  let nonexistantFiles = files.filter(f => !fs.existsSync(f));
  if (nonexistantFiles.length > 0) {
    throw new Error('Couldn\'t find file(s):\n' + nonexistantFiles.map(f => ' - ' + f).join('\n'));
  }

  let conflicts = splitFiles.filter(([dir, name]) => fs.existsSync());


  let licenseInfo = getLicenseInfo(fs.readFileSync(licenseFile, 'utf8'));

  let missingInfo = files.filter(f => !licenseInfo.hasInfo(f));
  if (missingInfo.length > 0) {
    throw new Error('Missing license info for:\n' + missingInfo.map(f => ' - ' + f).join('\n'));
  }

  splitFiles.forEach(([dir, name]) => {
    rename(licenseInfo, {name, dir, newDir: type});
  });

  let newLicense = licenseInfo.dump();
  fs.writeFileSync(licenseFile, newLicense, 'utf8');
}


function removeCommand(files) {
  let nonexistantFiles = files.filter(f => !fs.existsSync(f));
  if (nonexistantFiles.length > 0) {
    throw new Error('Missing file(s):\n' + nonexistantFiles.map(f => ' - ' + f).join('\n'));
  }

  let splitFiles = files.map(f => f.split('/'));
  let dumbFiles = splitFiles.filter(p => p.length !== 2 || ['pass', 'fail', 'early'].indexOf(p[0]) === -1);
  if (dumbFiles.length > 0) {
    throw new Error('Files outside of managed directories:\n' + dumbFiles.map(f => ' - ' + f.join('/')).join('\n'));
  }

  let licenseInfo = getLicenseInfo(fs.readFileSync(licenseFile, 'utf8'));

  splitFiles.forEach(([dir, name]) => {
    fs.unlinkSync(dir + '/' + name);
    if (dir === 'pass' && fs.existsSync('pass-explicit/' + name)) {
      fs.unlinkSync('pass-explicit/' + name);
    }
    licenseInfo.remove(dir + '/' + name);
  });

  let newLicense = licenseInfo.dump();
  fs.writeFileSync(licenseFile, newLicense, 'utf8');
}


function fixNamesCommand() {
  let wrongNames = checkNames();
  if (wrongNames.length === 0) {
    console.log('All names look good!');
    return;
  }

  console.log('Files to be renamed:');
  for (let {dir, name, correctName} of wrongNames) {
    console.log(` ${chalk.bold('-')} ${dir}/${name} ${chalk.bold('→')} ${dir}/${correctName}`);
  }

  inquirer.prompt([{type: 'confirm', name: 'rename', message: 'Perform rename?', default: false}]).then(({rename: confirmed}) => {
    if (!confirmed) process.exit(1);

    let licenseInfo = getLicenseInfo(fs.readFileSync(licenseFile, 'utf8'));

    for (let {dir, name, correctName} of wrongNames) {
      rename(licenseInfo, {name, newName: correctName, dir});
    }

    let newLicense = licenseInfo.dump();
    fs.writeFileSync(licenseFile, newLicense, 'utf8');
    console.log('Done!');
  });
}



  // let {licenses, rename: renameLicense, hasLicenseInfo} = loadLicenses(fs.readFileSync(licenseFile, 'utf8'));

  // fixNames(licenses, renameLicense);

  // let newLicense = dumpLicenses(licenses);
  // fs.writeFileSync(licenseFile, newLicense, 'utf8');





// let doubles = [];
// for (let dir of ['pass', 'fail', 'early']) {
//   let names = new Map();
//   for (let a of fs.readdirSync(dir)) {
//     let s = slug(fs.readFileSync(dir + '/' + a, 'utf8'));
//     if (names.has(s)) {
//       doubles.push(dir + '/' + a);
//       // // console.log(a, s, names.get(s));
//       // let o1 = fs.readFileSync(dir + '/' + a, 'utf8');
//       // let o2 = fs.readFileSync(dir + '/' + names.get(s), 'utf8');
//       // console.log(o1 === o2, dir);
//     }

//     names.set(s, a);
//   }
// }
// removeCommand(doubles);


const commands = {
  help: 'Display this message.',
  mark: 'Change the pass/fail/early categorization of one or more files. e.g., ./manage.js mark pass fail/dead.js fail/cafe.js',
  remove: 'Remove one or more files entirely. e.g., ./manage.js remove fail/dead.js fail/cafe.js',
  'fix-names': 'Update all names',
};

const usage = commandLineUsage([{
  header: 'Test262 Parser Test Manager',
  content: 'Manage tests'
}, {
  header: 'Commands',
  content: Object.keys(commands).map(name => ({ name, summary: commands[name] }))
}]);



const validCommands = [null].concat(Object.keys(commands));
const {command, argv} = commandLineCommands(validCommands);


switch (command) {
  case 'mark': {
    if (argv.length === 0) {
      console.log('The \`mark\` command requires a kind parameter one of "pass", "fail", or "explicit".');
      process.exit(1);
    }
    let type = argv[0];
    if (['pass', 'fail', 'early'].indexOf(type) === -1) {
      console.log('The \`mark\` command requires a kind parameter one of "pass", "fail", or "explicit".');
      process.exit(1);
    }
    let files = argv.slice(1);
    markCommand(type, files);
    break;
  }
  case 'remove': {
    console.log('TODO');
    break;
  }
  case 'fix-names': {
    if (argv.length !== 0) {
      console.log('The \`fix-names\` command takes no arguments.');
      process.exit(1);
    }
    fixNamesCommand();
    break;
  }
  default:
    console.log(usage);
    return;
}

