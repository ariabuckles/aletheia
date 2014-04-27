var _else = {identifier: 'else'};
var _if = function(condition, trueLambda, optionalElse, falseLambda) {
    if (optionalElse != null && optionalElse != _else) {
        throw new Error('if called with third parameter != else');
    }
    if (condition != null && condition !== false) {
        return trueLambda.call(undefined);
    } else if (falseLambda != null) {
        return falseLambda.call(undefined);
    }
};
var _while = function(conditionLambda, bodyLambda) {
    while (conditionLambda.call(undefined)) {
        bodyLambda.call(undefined);
    }
}

var assert = require("assert");
var _ = require("underscore");
var parser = require("./parser.js");
var normalize = require("./normalize.js");
var rewrite = require("./rewrite-symbols.js");
var compile = require("./code-gen.js");
var exec = (function(source, context) {
var source_str = _if(_.isArray(source), (function() {
return source.join("\n");
}), _else, (function() {
return source;
}));
var parseTree = parser.parse(source_str);
var ast = normalize(parseTree);
var rewritten = rewrite(ast);
var gen = compile(rewritten);
var js = gen.toString(undefined);
var prelude = _.map(context, (function(value, key) {
return (((("var " + key) + " = context.") + key) + ";\n");
})).join("");
var jsFunc = new Function("context", (prelude + js));
jsFunc(context);
});
describe("aletheia", (function() {
describe("function calls", (function() {
it("should execute a zero-arg call", (function() {
var called = undefined;
var callback = (function() {
called = true;
});
var prgm = ["callback()"];
exec(prgm, {
callback: {
type: "variable",
name: "callback"
}
});
assert(called);
}));
}));
}));
