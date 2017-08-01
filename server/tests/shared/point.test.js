"use strict";
let test = require('tape');
let Point = require('../../../shared/Point');

class PointTest {
    constructor(){
        
    }

    unitTests(){
        test('the point should report the correct x and y coordinates', function(assert){
            let samplePoint = new Point.default(10, 10);
            assert.equal(samplePoint.x, 10);
            assert.equal(samplePoint.y, 10);
            assert.end();
        });
    }
}

module.exports = PointTest;
