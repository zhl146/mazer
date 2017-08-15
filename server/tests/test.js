
let unitTests = [];
let _ = require('lodash');
unitTests.push(new(require('./shared/point.test.js')));
unitTests.push(new(require('./shared/maze.test.js')));


_.forEach(unitTests,function(unitTest){
    unitTest.unitTests();
})


