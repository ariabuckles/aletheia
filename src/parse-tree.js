assert = require("assert");
_ = require("underscore");

var SyntaxNode = function(options) {
    if (!(this instanceof SyntaxNode)) {
        return new SyntaxNode(options);
    }
    assert(options.type != null);
    _.extend(this, options);
};

var StatementList = function(statements) {
    return new SyntaxNode({
        type: "statement-list",
        statements: statements
    });
};

var Assignment = function(modifier, left, right) {
    return new SyntaxNode({
        type: "assignment",
        modifier: modifier,
        left: left,
        right: right
    });
};

var Lambda = function(args, stmts) {
    return new SyntaxNode({
        type: "lambda",
        arguments: args,
        statements: statements
    });
};

var UnitList = function(units) {
    return new SyntaxNode({
        type: "unit-list",
        units: units
    });
};

var Table = function(fields) {
    return new SyntaxNode({
        type: "table",
    });
};

var Field = function(key, value) {
    this.type = "Field";
    this.key = key;
    this.value = value;
};

var TableAccess = function(table, key) {
    return new SyntaxNode({
        type: "table-access",
        table: table,
        key: key
    });
};

module.exports = {
    StatementList: StatementList,
    Declaration: Declaration,
    Mutation: Mutation,
    Function: Function_,
    FunctionCall: FunctionCall,
    Table: Table,
    Field: Field,
    TableAccess: TableAccess
};
