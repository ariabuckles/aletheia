var _ = require("underscore");
var SyntaxTree = require("./syntax-tree.js");
var SyntaxNode = SyntaxTree.SyntaxNode;

var translateSymbols = {
    if: '_if',
    else: '_else',
    while: '_while',
    for: '_for'
};

var rewrite = function(node) {
    if (_.isArray(node)) {
        return _.map(node, rewrite);
    } else if (node instanceof SyntaxNode) {
        return rewrite[node.type](node);
    } else {
        if (typeof node === "string") {
            if (translateSymbols[node] != null) {
                return translateSymbols[node];
            }
        }
        return node;
    }
};

_.extend(rewrite, {
    assignment: function(assign) {
        return new SyntaxNode({
            type: "assignment",
            modifier: assign.modifier,
            left: rewrite(assign.left),
            right: rewrite(assign.right)
        });
    },

    lambda: function(lambda) {
        return new SyntaxNode({
            type: "lambda",
            arguments: _.map(lambda.arguments, rewrite),
            statements: _.map(lambda.statements, rewrite)
        });
    },

    "table-access": function(tableAccess) {
        return new SyntaxNode({
            type: "table-access",
            table: rewrite(tableAccess.table),
            key: rewrite(tableAccess.key)
        });
    },

    "unit-list": function(unitList) {
        return new SyntaxNode({
            type: "unit-list",
            units: _.map(unitList.units, rewrite)
        });
    },

    "comparison": function(comp) {
        return new SyntaxNode({
            type: "comparison",
            sign: comp.sign,
            left: rewrite(comp.left),
            right: rewrite(comp.right)
        });
    }
});

module.exports = rewrite;
