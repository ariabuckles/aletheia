mutable i = 0
while [ret (i < 10)] [
    callback i
    mutate i = i + 1
]
endCallback i
