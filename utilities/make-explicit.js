const codegen = require('shift-codegen');
const FormattedCodeGen = codegen.FormattedCodeGen, Seq = codegen.Seq, Empty = codegen.Empty, Paren = codegen.Paren;
const parser = require('shift-parser');


function flatten(rep) {
  if (rep instanceof Seq) {
    let reps = [];
    rep.children.map(flatten).forEach(r => {
      if (r instanceof Seq) {
        reps.push(...r.children);
      } else if (!(r instanceof Empty)) {
        reps.push(r);
      }
    });
    if (reps.length === 1) {
      return reps[0];
    } else {
      return new Seq(reps);
    }
  } else {
    return rep;
  }
}

class ExplicitCodeGen extends FormattedCodeGen {
  paren(rep, first, last, empty) {
    rep = flatten(rep);
    if (rep instanceof Paren) {
      return rep;
    } else {
      return super.paren(rep, first, last, empty);
    }
  }

  p(node, precedence, a) {
    if (node.type === 'IdentifierExpression' || node.type === 'BindingIdentifier' || node.type === 'Super' || node.type === 'FunctionBody') {
      return a;
    }
    return this.paren(a);
  }

  reduceAssignmentExpression(node, obj) {
    if (node.expression.type !== 'IdentifierExpression' && node.expression.type !== 'BindingIdentifier') {
      obj.expression = this.paren(obj.expression);
    }
    return super.reduceAssignmentExpression(node, obj);
  }

  reduceCompoundAssignmentExpression(node, obj) {
    if (node.expression.type !== 'IdentifierExpression' && node.expression.type !== 'BindingIdentifier') {
      obj.expression = this.paren(obj.expression);
    }
    return super.reduceCompoundAssignmentExpression(node, obj);
  }

  reduceBinaryExpression(node, obj) {
    if (node.left.type !== 'IdentifierExpression' && node.left.type !== 'BindingIdentifier') {
      obj.left = this.paren(obj.left);
    }
    if (node.right.type !== 'IdentifierExpression' && node.right.type !== 'BindingIdentifier') {
      obj.right = this.paren(obj.right);
    }
    return super.reduceBinaryExpression(node, obj);
  }

  reduceVariableDeclarator(node, obj) {
    if (obj.init) {
      obj.init = this.paren(obj.init);
    }
    return super.reduceVariableDeclarator(node, obj);
  }
}

module.exports = function makeExplicit(src, isModule) {
  const ast = parser[isModule ? 'parseModule' : 'parseScript'](src);
  return codegen.default(ast, new ExplicitCodeGen());
}
