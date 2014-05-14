_ = require 'underscore'

mylist = {1, 2, 3}

mylist -> _.map [x | x + 1] -> _.map [x | console.log x]
