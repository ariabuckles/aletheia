var _ = require("underscore");
var SourceMap = require('source-map');
var SourceNode = SourceMap.SourceNode;

var SyntaxTree = require("./syntax-tree.js");
var SyntaxNode = SyntaxTree.SyntaxNode;

var preambleStr = [
    "var _else = {identifier: 'else'};",
    "var _if = function(condition, trueLambda, optionalElse, falseLambda) {",
    "    if (optionalElse != null && optionalElse != _else) {",
    "        throw new Error('if called with third parameter != else');",
    "    }",
    "    if (condition != null && condition !== false) {",
    "        return trueLambda.call(undefined);",
    "    } else if (falseLambda != null) {",
    "        return falseLambda.call(undefined);",
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
        return new SourceNode(null, null, "source.al",
            interleave(_.map(statements, compile), ";\n", true)
        );
    },

    assignment: function(assign) {
        var modifier = assign.modifier;
        var left = compile(assign.left);
        var right = compile(assign.right);
        if (modifier === null || modifier === "mutable") {
            return new SourceNode(null, null, "source.al", [
                "var ", left, " = ", right
            ]);
        } else if (modifier === "mutate") {
            return new SourceNode(null, null, "source.al", [
                left, " = ", right
            ]);
        } else {
            throw new Error("Invalid assignment modifier: " + modifier);
        }
    },

    "lambda-args": function(args) {
        return new SourceNode(null, null, "source.al",
            interleave(_.map(args, compile), ", ")
        );
    },

    lambda: function(lambda) {
        var args = lambda.arguments;
        var statements = lambda.statements;
        var result = new SourceNode(null, null, "source.al");

        result.add("(function(");
        console.log("lambda.arguments", args);
        console.log("args",compile["lambda-args"](args).toString());
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
    },

    "table-access": function(tableAccess) {
        return new SourceNode(null, null, "source.al", [
            compile(tableAccess.table),
            ".",
            compile(tableAccess.key)
        ]);
    },

    "operation": function(comp) {
        var left = new SourceNode(null, null, "source.al", compile(comp.left));
        var right = new SourceNode(null, null, "source.al", compile(comp.right));
        var op = comp.operation;
        if (op === "==") {
            op = "===";
        } else if (op === "!=") {
            op = "!==";
        }
        return new SourceNode(null, null, "source.al", [
            "(",
            // TODO(jack) we'll need to use something other than null here so
            // that we can use a null literal for compile time macros
            (left != null ? left : ""),
            " ",
            op,
            " ",
            (right != null ? right : ""),
            ")"
        ]);
    },

    "variable": function(variable) {
        console.log("VARIABLE:", JSON.stringify(variable));
        return new SourceNode(null, null, "source.al", variable.name);
    }
});

var compileWithPreamble = function(fileNode) {
    return new SourceNode(null, null, "source.al", [
        getPreamble(),
        "\n",
        compile["statement-list"](fileNode)
    ]);
};

module.exports = compileWithPreamble;
