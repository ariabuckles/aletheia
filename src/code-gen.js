var _ = require("underscore");
var SourceMap = require('source-map');
var SourceNode = SourceMap.SourceNode;

var SyntaxTree = require("./syntax-tree.js");
var SyntaxNode = SyntaxTree.SyntaxNode;

var preambleStr = [
    "var _if = function(condition, lambda) {",
    "    if (condition) {",
    "        lambda.call(undefined);",
    "    }",
    "};",
    ""
].join("\n");

var getPreamble = function() {
    return new SourceNode(null, null, null, preambleStr);
};

var compile = function(node) {
    if (_.isArray(node)) {
        return new SourceNode(null, null, "source.al", _.map(node, compile));
    } else if (node instanceof SyntaxNode) {
        return compile[node.type](node);
    } else {
        // compile time constant
        return new SourceNode(null, null, "source.al", String(node));
    }
};
_.extend(compile, {
    assignment: function(assign) {
        return new SourceNode(null, null, "source.al", [
            "var ",
            compile(assign.left),
            " = ",
            compile(assign.right),
            ";\n"
        ]);
    },

    lambda: function(lambda) {
        var args = lambda.arguments;
        var statements = lambda.statements;
        var result = new SourceNode(null, null, "source.al");

        result.add("(function(");

        _.each(args, function(arg, i) {
            result.add(compile(arg));
            if (i + 1 !== args.length) {
                result.add(', ');
            }
        });

        result.add(") {\n");
        result.add(compile(statements));
        result.add("})");

        return result;
    }
});

var compileWithPreamble = function(fileNode) {
    return new SourceNode(null, null, "source.al", [
        getPreamble(),
        compile(fileNode)
    ]);
};

module.exports = compileWithPreamble;
