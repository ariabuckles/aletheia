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

var fs = require("fs");
var _ = require("underscore");
var parser = require("./parser.js");
var normalize = require("./normalize.js");
var rewrite = require("./rewrite-symbols.js");
var compile = require("./code-gen.js");
var this_program_regex = new RegExp("alc$");
var exe_index = _.indexOf(_.map, process.argv, (function() {
return this_program_regex.test(arg);
}), true);
var input_file = process.argv[(exe_index + 1)];
var output_file = process.argv[(exe_index + 2)];
var debug = (process.argv[(exe_index + 3)] === "--debug");
_if((((exe_index < 0) || (input_file === undefined)) || (output_file === undefined)), (function() {
console.log("usage: alc input_file.al output_file.js");
process.exit(1);
}));
console.log((((("Compiling '" + input_file) + "' into '") + output_file) + "':"));
var program = fs.readFileSync(input_file, {
encoding: "utf8"
});
var parseTree = parser.parse(program);
var ast = normalize(parseTree);
var rewritten = rewrite(ast);
var gen = compile(rewritten);
var code = gen.toString(undefined);
fs.writeFileSync(output_file, code, {
encoding: "utf8"
});
console.log((((("Finished compiling '" + input_file) + "' into '") + output_file) + "'."));
