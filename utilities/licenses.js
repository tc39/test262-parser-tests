function dumpLicenses(data) {
  let out = []
  for (let {key, license, files} of data.sort((a, b) => a.key < b.key ? -1 : 1)) {
    out.push('## ' + key);
    out.push('');
    out.push(license);
    out.push(...files.sort((a, b) => a.name < b.name ? -1 : 1).map(f => '* ' + f.name));
    out.push('');
  }
  return out.join('\n');
}

module.exports = function loadLicenses(str) {
  const lines = str.split('\n');
  let licenses = [];

  let pos = 0;

  let fileMap = new Map();

  function hasInfo(name) {
    return fileMap.has(name);
  }

  function rename(name, newName) {
    if (!hasInfo(name)) {
      throw new Error('Missing license information for file ' + name);
    }
    let obj = fileMap.get(name);
    obj.name = newName;
    fileMap.delete(name);
    fileMap.set(newName, obj);
  }

  function remove(name) {
    if (!hasInfo(name)) {
      throw new Error('Missing license information for file ' + name);
    }
    let obj = fileMap.get(name);
    for (let license of licenses) {
      let index = license.files.indexOf(obj);
      if (index !== -1) {
        license.files.splice(index, 1);
      }
    }
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

  return {remove, rename, hasInfo, dump: () => dumpLicenses(licenses)};
  // TODO: 'add'
}
