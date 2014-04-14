#!/usr/bin/env node

// Modified from https://github.com/Khan/KAS,
// which is MIT licensed

var fs = require("fs");
var path = require("path");
var jison = require("jison");

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

            ["mutable",             'return "MUTABLE"'],
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
        // Things at the bottom happen before things at the top
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
        ["precedence", "STMT"],
        ["precedence", "STMT_LIST"],
        ["left", "FUNC_CALL"],
        ["left", "_separator"],
    ],
    start: "program",
    bnf: {
        "program": [
            ["statementList EOF", "console.log('statementList->program', $1); return $1;"],
            ["EOF", "console.log('EOF->program'); return new yy.StatementList([]);"]
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
            ["IDENTIFIER = expression", "$$ = new yy.Declaration(false, $1, $3);"],
            ["MUTABLE IDENTIFIER = expression", "$$ = new yy.Declaration(true, $2, $4);"],
            ["MUTATE lvalue = expression", "$$ = new yy.Mutation($2, $4);"],
            ["functionCall", "$$ = $1;", {prec: "STATEMENT_BODY"}]
        ],
        "expression": [
            ["functionCall", "console.log('functionCall->expression'); $$ = $1;", {prec: "WRAP_EXPR"}],
            ["unitExpression", "console.log('unitExpression->expression', $1); $$ = $1;", {prec: "WRAP_EXPR"}],
        ],
        "unitExpression": [
            ["( expression )", "$$ = $1;"],
            ["function", "$$ = $1;"],
            ["literal", "$$ = $1;"],
            ["lvalue", "$$ = $1;"]
        ],
        "lvalue": [
            ["IDENTIFIER", "$$ = $1;"],
//            ["tableaccess", "$$ = $1;"]
        ],
        "functionCall": [
            ["unitExpression unitExpression", "$$ = new yy.FunctionCall($1, [$2]);", {prec: "FUNC_CALL"}],
            ["functionCall unitExpression", "$$ = $1; $1.pushArg($2);", {prec: "FUNC_CALL"}]
        ],
//        "tableaccess": [
//
//        ],
        "literal": [
            ["NUMBER", "$$ = $1;"],
            ["STRING", "$$ = $1;"],
            ["table", "$$ = $1;"]
        ],
        "table": [
            ["{ : }", "$$ = new yy.Table([]);"],
            ["{ fieldList }", "$$ = new yy.Table($2);"]
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
            ["expression", "$$ = new yy.Field(null, $1);"],
            ["IDENTIFIER : expression", "$$ = new yy.Field($1, $3);"]
        ],
        "function": [
            ["[ statementList ]", "console.log('func'); $$ = new yy.Function([], $2);"],
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

