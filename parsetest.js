var fs = require("fs");

var parser = require("./src/parser.js");
var normalize = require("./src/normalize.js");

var program = fs.readFileSync("./test.al", {encoding: 'utf8'});

console.log(program);
console.log('\n');

var parseTree = parser.parse(program);
var ast = normalize(parseTree);

module.exports = ast;
