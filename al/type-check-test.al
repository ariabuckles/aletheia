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

        it "should allow mutating a variable with the same type" [|
            assert.doesNotThrow [
                compile {
                    "mutable a = 5"
                    "mutate a = 6"
                }
            ]
        ]

        it "should not allow mutating a variable with an incompatible type" [|
            assert.throws [
                compile {
                    "mutable a = 5"
                    "mutate a = true"
                }
            ] SyntaxError
        ]

        it "should allow mutating a ? type variable to any type" [|
            assert.doesNotThrow [
                compile {
                    "mutable a :: ? = 5"
                    "mutate a = true"
                }
            ]
        ]

        it "should allow mutating a table field to a compatible value" [|
            assert.doesNotThrow [
                compile {
                    "mutable t = {a: 5, b: 6}"
                    "mutate t.a = t.b"
                }
            ]
        ]

        it "should not allow mutating a table field to an incompatible value" [|
            assert.throws [
                compile {
                    "mutable t = {a: 5, b: 6}"
                    "mutate t.a = true"
                }
            ] SyntaxError
        ]
    ]
]
