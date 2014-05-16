_  = require "underscore"

parser = require "./parser.js"
desugar = require "./desugar.js"
primitivize = require "./primitivize.js"
rewrite = require "./rewrite-symbols.js"
codegen = require "./code-gen.js"

compile = [ source |
    parseTree = parser.parse source
    ast = desugar parseTree
    prim = primitivize ast
    rewritten = rewrite prim
    gen = codegen rewritten
    ret gen
]

mutate module.exports = compile
