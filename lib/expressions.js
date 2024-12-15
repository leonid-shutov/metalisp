'use strict';

const OPERATORS = require('./operators.js');
const { head } = require('./utils.js');

const BOOL = {
  t: true,
  nil: false,
  true: true,
  false: false,
};

class BooleanExpression {
  constructor(value) {
    this.type = 'boolean';
    if (!(value in BOOL)) {
      throw new Error(`Unknown boolean value: ${value}`);
    }
    this.value = BOOL[value];
  }

  interpret() {
    return this.value;
  }
}

class NumberExpression {
  constructor(value) {
    this.type = 'number';
    this.value = parseFloat(value);
  }

  interpret() {
    return this.value;
  }

  toExpression() {
    return this.value;
  }

  toJavaScript() {
    return `() => ${this.value}`;
  }
}

class VariableExpression {
  constructor(name) {
    this.type = 'variable';
    this.name = name;
    this.identifiers = new Set([name]);
  }

  interpret(context) {
    if (!(this.name in context)) {
      throw new Error(`Variable "${this.name}" is not defined`);
    }
    return context[this.name];
  }

  toExpression() {
    return this.name;
  }

  toJavaScript() {
    return `(${this.name}) => ${this.name}`;
  }
}

class OperationExpression {
  constructor(operator, operands) {
    this.type = 'operation';
    this.identifiers = new Set();
    this.operator = operator;
    this.operands = operands;

    for (const operand of operands) {
      if (operand.identifiers !== undefined) {
        for (const name of operand.identifiers) {
          this.identifiers.add(name);
        }
      }
    }
  }

  interpret(context) {
    const args = this.operands.map((x) => x.interpret(context));
    const operator = OPERATORS[this.operator];
    if (!operator) throw new Error(`Unknown operator: ${this.operator}`);
    return operator(...args);
  }

  toExpression() {
    const list = this.operands.map((x) => x.toExpression());
    return `(${list.join(this.operator)})`;
  }

  toJavaScript() {
    let header = '(';

    for (const identifier of this.identifiers) {
      if (header.length > 1) {
        header += ', ';
      }
      header += identifier;
    }

    header += ')';

    return `${header} => ${this.toExpression()}`;
  }
}

class ConditionExpression {
  constructor(clauses) {
    this.type = 'condition';
    this.identifiers = new Set();
    this.clauses = clauses;

    for (const { condition, consequents } of clauses) {
      if (condition.identifiers !== undefined) {
        for (const identifier of condition.identifiers) {
          this.identifiers.add(identifier);
        }
      }

      for (const consequent of consequents) {
        if (consequent.identifiers !== undefined) {
          for (const identifier of consequent.identifiers) {
            this.identifiers.add(identifier);
          }
        }
      }
    }
  }

  // eslint-disable-next-line consistent-return
  interpret(context) {
    for (const { condition, consequents } of this.clauses) {
      if (condition.interpret(context) !== false) {
        return consequents.reduce(
          (_, consequent) => consequent.interpret(context),
          undefined,
        );
      }
    }
  }

  toExpression() {
    const ifExpressions = this.clauses.map(({ condition, consequents }) => {
      const ifExpression = `if ${condition.toExpression()}`;

      const consequentExpressions = consequents.map((consequent, i) =>
        i === consequents.length - 1
          ? `return ${consequent.toExpression()};`
          : `${consequent.toExpression()};`,
      );

      return `${ifExpression} {${consequentExpressions.join(' ')}}`;
    });

    return ifExpressions.join(' ');
  }

  toJavaScript() {
    let header = '(';

    for (const identifier of this.identifiers) {
      if (header.length > 1) {
        header += ', ';
      }
      header += identifier;
    }

    header += ')';

    return `${header} => {${this.toExpression()}}`;
  }
}

const expressions = {
  number: NumberExpression,
  variable: VariableExpression,
  boolean: BooleanExpression,
  operation: OperationExpression,
  condition: ConditionExpression,
};

const primitiveExpressions = [
  expressions.variable,
  expressions.number,
  expressions.boolean,
];
const isPrimitiveExpression = (Expression) =>
  primitiveExpressions.includes(Expression);

const getExpressionClass = (token) => {
  if (Array.isArray(token)) {
    if (head(token) === 'cond') return expressions.condition;
    return expressions.operation;
  }
  if (!isNaN(token)) return expressions.number;
  if (token in BOOL) return expressions.boolean;
  return expressions.variable;
};

module.exports = {
  NumberExpression,
  VariableExpression,
  OperationExpression,
  BooleanExpression,
  ConditionExpression,
  BOOL,
  expressions,
  getExpressionClass,
  isPrimitiveExpression,
};
