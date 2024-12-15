'use strict';

const {
  expressions,
  getExpressionClass,
  isPrimitiveExpression,
} = require('./expressions.js');
const { tail, head } = require('./utils.js');

const tokenize = (source) => {
  const stack = [];
  const parentStack = [];
  let current = stack;

  const tokens = source
    .replaceAll('(', ' ( ')
    .replaceAll(')', ' ) ')
    .trim()
    .split(/\s+/);

  for (const token of tokens) {
    if (token === '(') {
      const newStack = [];
      current.push(newStack);
      parentStack.push(current);
      current = newStack;
    } else if (token === ')') {
      current = parentStack.pop();
    } else {
      current.push(token);
    }
  }
  return stack[0];
};

const parse = (tokens) => {
  const Expression = getExpressionClass(tokens);

  if (isPrimitiveExpression(Expression)) return new Expression(tokens);

  const firstToken = head(tokens);
  const restTokens = tail(tokens);

  if (Expression === expressions.condition) {
    const clauses = restTokens.map((clause) => {
      const condition = parse(head(clause));
      const consequents = tail(clause).map(parse);
      return { condition, consequents };
    });
    return new Expression(clauses);
  }

  const operandExpressions = restTokens.map(parse);
  return new Expression(firstToken, operandExpressions);
};

const evaluate = (input, context = {}) => {
  const tokens = tokenize(input);
  const expression = parse(tokens);
  return expression.interpret(context);
};

module.exports = { tokenize, parse, evaluate };
