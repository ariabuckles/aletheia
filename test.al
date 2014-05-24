mutable a :: {{a: {'number'}, b: {'null', 'number'}}} = {a: 5, b: null}
mutable b :: {'number', 'null'} = 1
mutate b = a.b
