var assert = require("assert");
var _ = require("underscore");

var parser = require("./parser.js");
var normalize = require("./normalize.js");
var rewrite = require("./rewrite-symbols.js");
var compile = require("./code-gen.js");

var exec = function(source, context) {
    if (_.isArray(source)) {
        source = source.join('\n');
    }
    var parseTree = parser.parse(source);
    var ast = normalize(parseTree);
    var rewritten = rewrite(ast);
    var gen = compile(rewritten);
    var js = gen.toString();
    var prelude = _.map(context, function(value, key) {
        return "var " + key + " = context." + key + ";\n";
    }).join("");
    jsFunc = new Function('context', prelude + js);
    jsFunc(context);
};

describe("aletheia", function() {

    describe("if", function() {
        it("should execute for true", function() {
            var called = false;
            var callback = function() {
                called = true;
            };
            var prgm = [
                "if true [",
                "    callback undefined",
                "]"
            ];
            exec(prgm, {callback: callback});
            assert(called);
        });
    });

    describe("table literal", function() {
        it("should compile a simple table literal", function() {
            var result;
            var callback = function(param) {
                result = param;
            };
            var prgm = [
                "callback {",
                "    a: 5",
                "    b: 6",
                "}"
            ];
            exec(prgm, {callback: callback});
            assert.deepEqual(result, {a: 5, b: 6});
        }); 
    });

});
