_ = require "underscore"

contextualize = require "./contextualize"

checks = {
    require "./type-check"
}

error_check = [ ast external_vars |
    contextualizedAst = contextualize ast external_vars
    checks -> _.map [ check |
        check contextualizedAst.statements contextualizedAst.context
    ]
]

mutate module.exports = error_check
