var assert = require("assert");
var _ = require("underscore");

var parser = require("./parser.js");
var normalize = require("./normalize.js");
var rewrite = require("./rewrite-symbols.js");
var compile = require("./code-gen.js");

var exec = function(source, arg1, arg2, arg3, arg4, arg5) {
    if (_.isArray(source)) {
        source = source.join('\n');
    }
    var parseTree = parser.parse(source);
    var ast = normalize(parseTree);
    var rewritten = rewrite(ast);
    var gen = compile(rewritten);
    var js = gen.toString();
    console.log("EVAL'ING:", js);
    jsFunc = new Function('arg1', 'arg2', 'arg3', 'arg4', 'arg5', js);
    jsFunc(arg1, arg2, arg3, arg4, arg5);
};

describe("aletheia", function() {

    describe("if", function() {
        var called = false;
        // TODO(jack): remove this global hack in favor of passing
        // parameters to the aletheia code...
        var callback = function() {
            called = true;
        };
        it("should execute for true", function() {
            var prgm = [
                "if true [",
                "    arg1 undefined",
                "]"
            ];
            exec(prgm, callback);
            assert(called);
        });
    });


});
