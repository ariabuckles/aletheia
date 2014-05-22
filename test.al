it "should execute a zero-arg call" [|
    mutable called = undefined
    callback = [
        mutate called = true
    ]
    prgm = {
        "callback()"
    }
    exec prgm {callback: callback}
    assert called
]
