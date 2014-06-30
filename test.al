assert = require "assert"
_ = require "underscore"

is_instance = [a A | ret ```a instanceof A```]

ParseNode = [ options |
    self = this
    res = if (not (is_instance self ParseNode)) [
        ret new ParseNode options
    ] else [
        assert (options.type != null)
        _.extend self options
        ret self
    ]
    ret res
]
