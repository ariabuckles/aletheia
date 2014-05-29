assert = require "assert"
_ = require "underscore"

compile = require "./compile-for-testing"

describe = global.describe
it = global.it
SyntaxError = global.SyntaxError

describe "type checking" [|
    describe "use of an undefined variable" [|
        it "should throw a type error" [|
            assert.throws [
                compile {
                    "a = b"
                }
            ] SyntaxError
        ]

        it "should throw for mutating a const var" [|
            assert.throws [
                compile {
                    "a = 5"
                    "mutate a = 6"
                }
            ] SyntaxError
        ]

        it "should not throw for mutating a mutable" [|
            assert.doesNotThrow [
                compile {
                    "mutable a = 5"
                    "mutate a = 6"
                }
            ]
        ]
    ]
]
