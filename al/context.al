console = global.console
assert = require "assert"
nodeUtil = require "util"
_ = require "underscore"

inspect = nodeUtil.inspect

DEBUG_CONTEXT = false

MAGIC = {
    self = true
    this = true
    _it = true
}

// A context is an array of scopes of variables
// TODO: Fix variables named __proto__
Context :: ? = [ parentContext |
    mutate this.parent = parentContext
    mutate this.scope = Object.create parentContext.scope
    delete this.scope.x  // Disable hidden classes for this.scope
]

_.extend Context.prototype {
    get = [ varname |
        ret this.scope@varname
    ]

    has = [ varname |
        assert (_.isString varname) (
            "passed a non string to Context.has: " + varname
        )
        ret ((this.get varname) != undefined)
    ]

    get_modifier = [ varname |
        vardata = this.get varname
        ret if vardata [ vardata.modifier ] else [ 'undeclared' ]
    ]

    may_declare = [ varname |
        if DEBUG_CONTEXT [
            console.log "may_declare" varname (this.get varname) ((this.get varname) == undefined)
        ]
        ret ((this.get varname) == undefined)
    ]

    may_be_param = [ varname |
        ret (((this.may_declare varname) or MAGIC@varname) == true)
    ]

    may_mutate = [ varname |
        ret ((this.get_modifier varname) == 'mutable')
    ]

    declare = [ modifier varname exprtype value |
        actual_modifier = if (not modifier) ['const'] else [modifier]
        assert actual_modifier
        assert varname
        mutate this.scope@varname = {
            modifier: actual_modifier
            exprtype: exprtype
            value: value
            context: this
        }
    ]

    pushScope = [
        ret new Context this
    ]

    popScope = [
        ret this.parent
    ]
}

mutate module.exports = Context

