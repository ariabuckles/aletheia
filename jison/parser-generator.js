#!/usr/bin/env node

// Modified from https://github.com/Khan/KAS,
// which is MIT licensed

var fs = require("fs");
var path = require("path");
var jison = require("jison");
var outputFile = (function(args) {
    var index = args.indexOf("-o") + 1;
    if (index === 0 || index === args.length) {
        throw new Error("Must supply an output file name with a -o option");
    }
    return args[index];
})(process.argv);

var grammar = {
    lex: {
        rules: [
            ["\\n\\s*",             'return "NEWLINE"'],
            ["\\s+",                '/* skip other whitespace */'],

            ["==|!=|<|>|<=|>=",     'return "SIGN"'],

            ["\\*",                 'return "*"'],
            ["\\/",                 'return "/"'],
            ["-",                   'return "-"'],
            ["\\+",                 'return "+"'],
            ["\\%",                 'return "%"'],

            ["\\(",                 'return "("'],
            ["\\)",                 'return ")"'],
            ["\\{",                 'return "{"'],
            ["\\}",                 'return "}"'],
            ["\\|",                 'return "|"'],
            ["\\[",                 'return "["'],
            ["\\]",                 'return "]"'],

            ["=",                   'return "="'],
            ["\\!",                 'return "!"'],
            ["\\:",                 'return ":"'],
            ["\\.",                 'return "DOT"'],

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
        // Things at the bottom happen before things at the top
        ["precedence", "IDENTIFIER", "NUMBER", "STRING"],
        ["nonassoc", "SIGN", "COMPARISON"],
        ["left", "+", "-"],
        ["nonassoc", "REDUCE_TO_ADDITIVE"],
        ["left", "*", "/"],
        ["nonassoc", "UMINUS"],
        ["left", "DOT"],
        ["precedence", "(", "[", "{"],
        ["precedence", "WRAP_EXPR"],
        ["precedence", "STMT"],
        ["precedence", "STMT_LIST"],
        ["left", "FUNC_CALL"],
        ["left", "_separator"],
    ],
    start: "program",
    bnf: {
        "program": [
            ["statementList EOF", "return $1;"],
            ["EOF", "return [];"]
        ],
        "statementList": [
            ["statementListBody", "$$ = $1;"],
            ["statementListBody separator", "$$ = $1;"],
            ["separator statementListBody", "$$ = $2;"],
            ["separator statementListBody separator", "$$ = $2;"]
        ],
        "statementListBody": [
            ["statement", "$$ = [$1]", {prec: "STMT"}],
            ["statementListBody separator statement", "$$ = $1; $1.push($3);", {prec: "STMT_LIST"}],
        ],
        "separator": [
            ["NEWLINE", "", {prec: "_separator"}],
            ["separator NEWLINE", "", {prec: "_separator"}]
        ],
        "statement": [
            ["lvalue = expression", "$$ = yy.Declaration($1, $3);"],
            ["unitList = expression", "$$ = yy.Assignment($1, $3);"],
            ["unitList", "$$ = $1;", {prec: "STATEMENT_BODY"}]
        ],
        "expression": [
            ["unitList", "$$ = $1;", {prec: "WRAP_EXPR"}],
            ["additive", "$$ = $1;", {prec: "WRAP_EXPR"}],
            ["additive SIGN additive", "$$ = yy.Operation($1, $2, $3);", {prec: "COMPARISON"}],
        ],
        "unitExpression": [
            ["( expression )", "$$ = $2;"],
            ["function", "$$ = $1;"],
            ["literal", "$$ = $1;"],
            ["lvalue", "$$ = $1;"],
        ],
        "lvalue": [
            ["IDENTIFIER", "$$ = yy.Variable($1);", {prec: "WRAP_EXPR"}],
            ["tableaccess", "$$ = $1;"]
        ],
        "unitList": [
            ["unitExpression unitExpression", "$$ = yy.UnitList([$1, $2]);", {prec: "FUNC_CALL"}],
            ["unitList unitExpression", "$$ = $1; $1.units.push($2);", {prec: "FUNC_CALL"}]
        ],
        "tableaccess": [
            ["unitExpression DOT IDENTIFIER", "$$ = new yy.TableAccess($1, $3);"]
        ],
        "literal": [
            ["NUMBER", "$$ = Number($1);"],
            ["STRING", "$$ = $1.slice(1, -1);"],
            ["table", "$$ = $1;"]
        ],
        "table": [
            ["{ : }", "$$ = new yy.Table([], true);"],
            ["{ fieldList }", "$$ = new yy.Table($2, false);"]
        ],
        "fieldList": [
            ["fieldListBody", "$$ = $1;"],
            ["fieldListBody separator", "$$ = $1;"],
            ["separator fieldListBody", "$$ = $2;"],
            ["separator fieldListBody separator", "$$ = $2;"],
        ],
        "fieldListBody": [
            ["field", "$$ = [$1];"],
            ["fieldListBody separator field", "$$ = $1; $1.push($3);"]
        ],
        "field": [
            ["expression", "$$ = yy.Field(null, $1);"],
            ["IDENTIFIER : expression", "$$ = yy.Field($1, $3);"]
        ],
        "function": [
            ["[ statementList ]", "$$ = yy.Lambda([], $2);"],
            ["[ unitList | statementList ]", "$$ = yy.Lambda($2.units, $4);"],
            ["[ unitExpression | statementList ]", "$$ = yy.Lambda([$2], $4);"]
        ],
        "additive": [
            ["unitExpression", "$$ = $1;", {prec: "REDUCE_TO_ADDITIVE"}],
            ["additive + additive", "$$ = yy.Operation($1, $2, $3);"],
            ["additive - additive", "$$ = yy.Operation($1, $2, $3);"],
        ],
//        "additive": [
//            ["additive + multiplicative", "$$ = yy.Add.createOrAppend($1, $3);"],
//            ["additive - multiplicative", "$$ = yy.Add.createOrAppend($1, yy.Mul.handleNegative($3, \"subtract\"));"],
//            ["multiplicative", "$$ = $1;", {prec: "+"}]
//        ],
//        "multiplicative": [
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
var postlude = "\n\nparser.yy = require('./parse-tree.js');\nmodule.exports = parser;\n";

fs.writeFileSync(outputFile, prelude + parser + postlude);

