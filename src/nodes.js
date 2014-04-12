
var StatementList = function(stmts) {
    console.log("StatementList", stmts);
    this.name = "StatementList";
    this.stmts = stmts;
};

var Declaration = function(isMutable, identifier, expr) {
    console.log("Declaration", isMutable, identifier, expr);
    this.name = "Declaration";
    this.isMutable = isMutable;
    this.identifier = identifier;
    this.expr = expr;
};

var Mutation = function(lvalue, expr) {
    console.log("Mutation", lvalue, expr);
    this.name = "Mutation";
    this.lvalue = lvalue;
    this.expr = expr;
};

var Function_ = function(args, stmts) {
    console.log("Function", args, stmts);
    this.name = "Function";
    this.args = args;
    this.stmts = stmts;
};

var FunctionCall = function(func, args) {
    console.log("FunctionCall", func, args);
    this.name = "FunctionCall";
    this.func = func;
    this.args = args;
};
FunctionCall.prototype.pushArg = function(arg) {
    this.args.push(arg);
};

module.exports = {
    StatementList: StatementList,
    Declaration: Declaration,
    Mutation: Mutation,
    Function: Function_,
    FunctionCall: FunctionCall
};
