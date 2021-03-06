var _else = {identifier: 'else'};
var _if = function(cond1, lambda1, cond2, lambda2) {
    if (arguments.length % 2 !== 0) {
        throw new Error('if called with an odd number of arguments');
    }
    var i = 0;
    for (var i = 0; i < arguments.length; i += 2) {
        var condition = arguments[i];
        if (condition != null && condition !== false) {
            return arguments[i + 1].call(undefined);
        }
    }
};

var _while = function(conditionLambda, bodyLambda) {
    while (conditionLambda.call(undefined)) {
        bodyLambda.call(undefined);
    }
}

var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var compile = require("./compile");
var repl = require("./repl");
var console = global.console;
var process = global.process;
var this_program_filename = path.basename(__filename);
var this_program_regex = new RegExp((this_program_filename + "$"));
var exe_index = _.indexOf(_.map(process.argv, (function(arg) {
return this_program_regex.test(arg);
})), true);
var input_file = process.argv[(exe_index + 1)];
var output_file = process.argv[(exe_index + 2)];
var debug = (process.argv[(exe_index + 3)] === "--debug");
_if((input_file === "-i"), (function(_it) {
console.log("Aletheia repl\n");
repl.start([]);
}), _else, (function(_it) {
_if((((exe_index < 0) || (input_file === undefined)) || (output_file === undefined)), (function(_it) {
console.log("usage: alc input_file.al output_file.js");
process.exit(1);
}));
console.log((((("Compiling '" + input_file) + "' into '") + output_file) + "':"));
var program = fs.readFileSync(input_file, {
encoding: "utf8"
});
var gen = compile(program);
var code = gen.toString();
fs.writeFileSync(output_file, code, {
encoding: "utf8"
});
console.log((((("Finished compiling '" + input_file) + "' into '") + output_file) + "'."));
}));
