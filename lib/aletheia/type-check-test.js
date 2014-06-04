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

var assert = require("assert");
var _ = require("underscore");
var compile = require("./compile-for-testing");
var describe = global.describe;
var it = global.it;
var SyntaxError = global.SyntaxError;
describe("type checking", (function() {
describe("undeclared variables", (function() {
it("use of an undeclared variable should throw a type error", (function() {
assert.throws((function(_it) {
compile(["a = b"]);
}), SyntaxError);
}));
it("use of a declared variable should not throw a type error", (function() {
assert.doesNotThrow((function(_it) {
compile(["b = 6",
"a = b"]);
}));
}));
}));
describe("variable mutation", (function() {
it("should throw for mutating a const var", (function() {
assert.throws((function(_it) {
compile(["a = 5",
"mutate a = 6"]);
}), SyntaxError);
}));
it("should not throw for mutating a mutable", (function() {
assert.doesNotThrow((function(_it) {
compile(["mutable a = 5",
"mutate a = 6"]);
}));
}));
}));
describe("variable types", (function() {
it("should allow mutating a variable with the same type", (function() {
assert.doesNotThrow((function(_it) {
compile(["mutable a = 5",
"mutate a = 6"]);
}));
}));
it("should not allow mutating a variable with an incompatible type", (function() {
assert.throws((function(_it) {
compile(["mutable a = 5",
"mutate a = true"]);
}), SyntaxError);
}));
it("should allow mutating a ? type variable to any type", (function() {
assert.doesNotThrow((function(_it) {
compile(["mutable a :: ? = 5",
"mutate a = true"]);
}));
}));
it("type should be transitive through multiple assignments", (function() {
assert.doesNotThrow((function(_it) {
compile(["a = 6",
"mutable b = a",
"mutate b = 7"]);
}));
assert.throws((function(_it) {
compile(["a = 6",
"mutable b = a",
"mutate b = 'hi'"]);
}), SyntaxError);
}));
it("an object with more keys should be assignable to a fewer-keyed variable", (function() {
assert.doesNotThrow((function(_it) {
compile(["mutable t = {a: 1}",
"mutate t = {a: 2, b: 3}"]);
}));
}));
it("an object with fewer keys should not be assignable to a more-keyed variable", (function() {
assert.throws((function(_it) {
compile(["mutable t = {a: 1, b: 2}",
"mutate t = {a: 3}"]);
}), SyntaxError);
}));
it("an array and an object should be incompatible types", (function() {
assert.throws((function(_it) {
compile(["mutable a = {:}",
"mutate a = {}"]);
}), SyntaxError);
assert.throws((function(_it) {
compile(["mutable a = {}",
"mutate a = {:}"]);
}), SyntaxError);
}));
}));
describe("table access types", (function() {
it("should allow mutating a table field to a compatible value", (function() {
assert.doesNotThrow((function(_it) {
compile(["mutable t = {a: 5, b: 6}",
"mutate t.a = t.b"]);
}));
}));
it("should not allow mutating a table field to an incompatible value", (function() {
assert.throws((function(_it) {
compile(["mutable t = {a: 5, b: 6}",
"mutate t.a = true"]);
}), SyntaxError);
}));
it("field type should infer variable type", (function() {
assert.throws((function(_it) {
compile(["t = {a: 5, b: 6}",
"mutable c = t.a",
"mutate c = {}"]);
}), SyntaxError);
}));
}));
}));
