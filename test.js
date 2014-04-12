var fs = require("fs");

var parser = require("./src/parser.js");

var program = fs.readFileSync("./test.al", {encoding: 'utf8'});

console.log(program);
console.log('\n');

var ast = parser.parse(program);

console.log('\n');
console.log(ast);
