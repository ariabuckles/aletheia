var assert = require("assert");
var _ = require("underscore");

var ParseNode = function(options) {
    if (!(this instanceof ParseNode)) {
        return new ParseNode(options);
    }
    assert(options.type != null);
    _.extend(this, options);
};

var ParseTree = {
    ParseNode: ParseNode,

    StatementList: function(statements) {
        return new ParseNode({
            type: "statement-list",
            statements: statements
        });
    },

    Assignment: function(modifier, left, right) {
        return new ParseNode({
            type: "assignment",
            modifier: modifier,
            left: left,
            right: right
        });
    },

    Lambda: function(args, statements) {
        console.log("Lambda", args);
        return new ParseNode({
            type: "lambda",
            arguments: args,
            statements: statements
        });
    },

    UnitList: function(units) {
        return new ParseNode({
            type: "unit-list",
            units: units
        });
    },

    Table: function(fields, forceObject) {
        return new ParseNode({
            type: "table",
            fields: fields,
            forceObject: forceObject
        });
    },

    Field: function(key, value) {
        return new ParseNode({
            type: "field",
            key: key,
            value: value
        });
    },

    TableAccess: function(table, key) {
        return new ParseNode({
            type: "table-access",
            table: table,
            key: key
        });
    },

    Comparison: function(left, sign, right) {
        return new ParseNode({
            type: "comparison",
            sign: sign,
            left: left,
            right: right
        });
    },

    Variable: function(name) {
        return new ParseNode({
            type: "variable",
            name: name
        });
    }
};

module.exports = ParseTree;
