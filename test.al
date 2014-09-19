fib = [ n |
    mutable a = 1
    mutable b = 0
    mutable i = 0
    while [ret (i < n)] [
        old_b = b
        mutate b = a + b
        mutate a = old_b
        mutate i = i + 1
    ]
    ret b
]

global.console.log (fib 4)
