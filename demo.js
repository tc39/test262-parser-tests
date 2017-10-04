const fs = require('fs');
const shift = require('../shift-parser-js/');
const assert = require('assert');

function parse(src, {isModule, earlyErrors}) {
  (isModule ? shift.parseModule : shift.parseScript)(src, {earlyErrors});
}

let passExcludes = [];
let failExcludes = [];
let earlyExcludes = ['024073814ce2cace.js', '033064204b44b686.js', '0e631216f7271fce.js', '0ed820b1748fb826.js', '1447683fba196181.js', '1447683fba196181.js', '14eaa7e71c682461.js', '1c22bc1b20bdacf1.js', '21f3dc70492447d0.js', '228aa4eba2418335.js', 'b6a72a718cb7ca67.js', '670343391d88a743.js', '24e27ce4ea8b1550.js', '59eb4e0a7c215b4c.js', 'f933ec047b8a7c3d.js', '8b659d2805837e98.js', '2b4520facdc72696.js', 'b4cac065cfcbc658.js', '1c22bc1b20bdacf1.js', '033064204b44b686.js', 'cdea3406c440ecf3.js', '63452bbeb15314d6.js', '79592a4804326355.js', 'b44d69c497ba8742.js', 'a633b3217b5b8026.js', '80c2d2d1d35c8dcc.js', '2c3cbce523ad436e.js', '2e95646f9143563e.js', '3121a50c07bfa0aa.js', '37cb3282e0c7d516.js', '3bc32f5a77e8468e.js', '5995f93582b8bd22.js', '5e4a34251d0fc48d.js', '78cb084c22573e4a.js', '7a2bf91be132b22d.js', '869ac2b391a8c7cd.js', '8c62442458de872f.js', '90c089b382d8aaf9.js', '9d030e1cf08f5d77.js', 'aca911e336954a5b.js', 'bd0a88a0f6b9250e.js', 'c9566d6dccc93ae5.js', 'd008c8cd68d4446e.js', 'd52f769ab39372c7.js', 'e9a40a98ec62f818.js', 'ea84c60f3b157d35.js', 'ef63ef2fa948d9b1.js', 'f0e47254d16fb114.js'];

fs.readdirSync('pass').filter(f => !passExcludes.includes(f)).forEach(f => {
  let firstTree, secondTree;
  assert.doesNotThrow(() => {
    firstTree = parse(
      fs.readFileSync(`pass/${f}`, 'utf8'),
      {isModule: f.match('.module.js'), earlyErrors: true}
    );
  }, f);
  assert.doesNotThrow(() => {
    secondTree = parse(
      fs.readFileSync(`pass-explicit/${f}`, 'utf8'),
      {isModule: f.match('.module.js'), earlyErrors: true}
    );
  });
  assert.deepStrictEqual(firstTree, secondTree);
});

fs.readdirSync('fail').filter(f => !failExcludes.includes(f)).forEach(f => {
  assert.throws(() => {
    parse(
      fs.readFileSync(`fail/${f}`, 'utf8'),
      {isModule: f.match('.module.js'), earlyErrors: false}
    );
  }, 'fail/' + f);
});

fs.readdirSync('early').filter(f => !earlyExcludes.includes(f)).forEach(f => {
  assert.doesNotThrow(() => {
    parse(
      fs.readFileSync(`early/${f}`, 'utf8'),
      {isModule: f.match('.module.js'), earlyErrors: false}
    );
  }, 'early/' + f + '\n' + fs.readFileSync(`early/${f}`, 'utf8'));
  assert.throws(() => {
    parse(
      fs.readFileSync(`early/${f}`, 'utf8'),
      {isModule: f.match('.module.js'), earlyErrors: true}
    );
  });
});
