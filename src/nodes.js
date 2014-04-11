
var StatementList = function(stmts) {
    this.stmts = stmts;
};

var Declaration = function(isMutable, identifier, expr) {
    this.isMutable = isMutable;
    this.identifier = identifier;
    this.expr = expr;
};

var Mutation = function(lvalue, expr) {
    this.lvalue = lvalue;
    this.expr = expr;
};

var Function_ = function(args, stmts) {
    this.args = args;
    this.stmts = stmts;
};

module.exports = {
    StatementList: StatementList,
    Declaration: Declaration,
    Mutation: Mutation,
    Function: Function_
};
