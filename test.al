assert = require "assert"
_ = require "underscore"

is_instance = [a A | ret ```a instanceof A```]

ParseNode = [ options2 |
    self = this
    res = if (not (is_instance self ParseNode)) [
        ret new ParseNode()
    ] else [
        ret self
    ]
    ret res
]
