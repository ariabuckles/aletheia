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

// Does something like Array::join, but returns a new
// array with the value interleaved, rather than a
// string.
//
// Used to interleave ", " commas between parameters
//
// > interleave(array, value).join("") === array.join(value)
var interleave = function(array, value, trailingValue) {
    var result = [];
    _.each(array, function(elem, i) {
        result.push(elem);
        if (i + 1 !== array.length || trailingValue) {
            result.push(value);
        }
    });
    return result;
};
//#test interleave [
//  #assert interleave(array, value).join("") === array.join(value)
//]

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
    "statement-list": function(statements) {
        return interleave(_.map(statements, compile), ";\n", true);
    },

    assignment: function(assign) {
        return new SourceNode(null, null, "source.al", [
            "var ",
            compile(assign.left),
            " = ",
            compile(assign.right)
        ]);
    },

    "lambda-args": function(args) {
        return interleave(_.map(args, compile), ", ");
    },

    lambda: function(lambda) {
        var args = lambda.arguments;
        var statements = lambda.statements;
        var result = new SourceNode(null, null, "source.al");

        result.add("(function(");
        result.add(compile["lambda-args"](args));
        result.add(") {\n");
        result.add(compile["statement-list"](statements));
        result.add("})");

        return result;
    },

    "unit-list": function(unitList) {
        // If we got here, we're a function call, since
        // unit-lists as lambda parameters get code-gen'd in `lambda`
        var result = new SourceNode(null, null, "source.al");

        result.add(compile(_.first(unitList.units)));

        result.add("(");

        var params = _.rest(unitList.units);
        _.each(params, function(unit, i) {
            result.add(compile(unit));
            if (i + 1 !== params.length) {
                result.add(", ");
            }
        });

        result.add(")");

        return result;
    }
});

var compileWithPreamble = function(fileNode) {
    return new SourceNode(null, null, "source.al", [
        getPreamble(),
        "\n",
        new SourceNode(null, null, "source.al",
            compile["statement-list"](fileNode)
        )
    ]);
};

module.exports = compileWithPreamble;
