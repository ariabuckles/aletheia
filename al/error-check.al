_ = require "underscore"
checks = {
	require "./const-check.js"
}

error_check = [ ast |
    checks -> _.map [ check |
	    check ast
    ]
]

mutate module.exports = error_check
