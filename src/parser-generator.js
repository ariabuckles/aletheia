#!/usr/bin/env node

// Modified from https://github.com/Khan/KAS,
// which is MIT licensed

var fs = require("fs");
var path = require("path");
var jison = require("jison");

var grammar = {
    lex: {
        rules: [
            ["\\s+",                '/* skip whitespace */'],

            ["==|!=|<|>|<=|>=",     'return "SIGN"'],

            ["\\*",                 'return "*"'],
            ["\\/",                 'return "/"'],
            ["-",                   'return "-"'],
            ["\\+",                 'return "+"'],
            ["\\%",                 'return "%"'],

            ["\\(",                 'return "("'],
            ["\\)",                 'return ")"'],
            ["\\{",                 'return "}"'],
            ["\\{",                 'return "}"'],
            ["\\|",                 'return "|"'],
            ["\\[",                 'return "["'],
            ["\\]",                 'return "]"'],

            ["=",                   'return "="'],
            ["\\n+",                'return "NEWLINE"'],
            ["\\!",                 'return "!"'],
            ["\\:",                 'return ":"'],

            ["var",                 'return "VARKEYWORD"'],
            ["mutate",              'return "MUTATE"'],

            ['\\"(\\\\.|[^"\\n])*\\"', 'return "STRING"'],
            ["[0-9]+\\.?",          'return "NUMBER"'],
            ["([0-9]+)?\\.[0-9]+",  'return "NUMBER"'],
            ["[a-zA-Z_$][a-zA-Z0-9_$]*", 'return "IDENTIFIER"'],

            ["$",                   'return "EOF"'],
            [".",                   'return "INVALID"'],
        ],
        options: {
            flex: true              // pick longest matching token
        }
    },
    operators: [
        ["precedence", "IDENTIFIER"],
        ["precedence", "NUMBER"],
        ["precedence", "STRING"],
        ["precedence", "("],
        ["precedence", "["],
        ["left", "+", "-"],
        ["left", "*", "/"],
        ["nonassoc", "UMINUS"],
        ["right", "^"],
        ["precedence", "WRAP_EXPR"],
        ["precedence", "STATEMENT_BODY"]
    ],
    start: "program",
    bnf: {
        "program": [
            ["statementList EOF", "return $1;"],
            ["EOF", "return new yy.StatementList([]);"]
        ],
        "statementList": [
            ["statement", "$$ = [$1]"],
            ["statementList statement", "$$ = $1; $1.push($2);"],
        ],
        "statement": [
            ["NEWLINE", ""],  // discard
            ["statementBody", "$$ = $1;"]
        ],
        "statementBody": [
            ["IDENTIFIER = expression", "return new yy.Declaration(false, $1, $3);"],
            ["VARKEYWORD IDENTIFIER = expression", "return new yy.Declaration(true, $2, $4);"],
            ["MUTATE lvalue = expression", "return new yy.Mutation($2, $3);"],
            ["functionCall", "$$ = $1;", {prec: "STATEMENT_BODY"}]
        ],
        "expression": [
            ["functionCall", "$$ = $1;", {prec: "WRAP_EXPR"}],
            ["unitExpression", "$$ = $1;", {prec: "WRAP_EXPR"}],
        ],
        "unitExpression": [
            ["( expression )", "$$ = [$1];"],
            ["function", "$$ = $1;"],
            ["literal", "$$ = $1;"],
            ["lvalue", "$$ = $1"]
        ],
        "lvalue": [
            ["IDENTIFIER", "$$ = $1"],
//            ["tableaccess", "$$ = $1"]
        ],
        "functionCall": [
            ["unitExpression unitExpression", "$$ = [$1, $2];"],
            ["functionCall unitExpression", "$$ = $1; $1.push($2);"]
        ],
//        "tableaccess": [
//
//        ],
        "literal": [
            ["NUMBER", "$$ = $1;"],
            ["STRING", "$$ = $1;"]
        ],
//        "table": [
//            ["{ }", "$$ = new yy.Table([]);"],
//            ["{ fieldList }", "$$ = new yy.Table([]);"]
//        ],
//        "fieldList": [
//            ["field", "$$ = [$1];"],
//            ["field NEWLINE field", "$$ = $1; $1.push($3);"]
//        ],
//        "field": [
//            ["expression", "$$ = new yy.Field(null, $1);"],
//            ["IDENTIFIER : expression", "$$ = new yy.Field($1, $3);"]
//        ],
        "function": [
            ["[ statementList ]", "$$ = new yy.Function([], $2);"],
//            ["[ argList | statementList ]", "$$ = new yy.Function($2, $4);"]
        ],
//        "additive": [
//            ["additive + multiplicative", "$$ = yy.Add.createOrAppend($1, $3);"],
//            ["additive - multiplicative", "$$ = yy.Add.createOrAppend($1, yy.Mul.handleNegative($3, \"subtract\"));"],
//            ["multiplicative", "$$ = $1;", {prec: "+"}]
//        ],
//        "multiplicative": [
//            // the second term in an implicit multiplication cannot be negative
//            ["multiplicative triglog", "$$ = yy.Mul.fold(yy.Mul.createOrAppend($1, $2));"],
//            ["multiplicative * negative", "$$ = yy.Mul.fold(yy.Mul.createOrAppend($1, $3));"],
//            ["multiplicative / negative", "$$ = yy.Mul.fold(yy.Mul.handleDivide($1, $3));"],
//            ["negative", "$$ = $1;"]
//        ],
//        "negative": [
//            ["- negative", "$$ = yy.Mul.handleNegative($2);", {prec: "UMINUS"}],
//            ["triglog", "$$ = $1;"]
//        ],
    }
};

var prelude = "";
var parser = (new jison.Parser(grammar, {debug: true})).generate({moduleType: "js"});
var postlude = "\n\nparser.yy = require('./nodes.js');\nmodule.exports = parser;\n";

fs.writeFileSync(path.resolve(__dirname, "parser.js"), prelude + parser + postlude);

