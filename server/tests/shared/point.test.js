"use strict";
let test = require('tape');
let Point = require('../../../shared/Point');

class PointTest {
    constructor(){
        
    }

    valueStorageTest(assert){
        let samplePoint = new Point(10, 10);
        assert.equal(samplePoint.x, 10, 'point has the correct x coordinate value');
        assert.equal(samplePoint.y, 10, 'point has the correct y coordinate value');
        assert.end();
    }

    parentTest(assert){
        let samplePointA = new Point(10, 10);
        let samplePointB = new Point(10, 11);
        samplePointA.setParent(samplePointB);
        assert.deepEqual(samplePointB, samplePointA.parent, 'tests setParent method');
        assert.end();
    }

    copyTest(assert){
        let samplePointA = new Point(10, 10);
        let samplePointB = samplePointA.copy();
        assert.deepEqual(samplePointB, samplePointA, 'copied point matches the point that was used to create it');
        assert.end();
    }

    setFGHTest(assert){
        let samplePointA = new Point(10, 10);
        samplePointA.g = 15;
        let samplePointB = new Point(12, 12);
        samplePointB.setParent(samplePointA);
        samplePointB.setG(10);
        samplePointB.setH(samplePointA);
        samplePointB.setF();
        assert.equal(samplePointB.g, 25);
        assert.equal(samplePointB.h, 28);
        assert.equal(samplePointB.f, 53);
        assert.end();
    }



    unitTests(){
        test('the point should report the correct x and y coordinates', this.valueStorageTest);
        test('the point should record parent correctly', this.parentTest);
        test('the point should copy correctly and match', this.copyTest);
        test('the point should calculate the value of g correctly', this.setFGHTest);
    }
}

module.exports = PointTest;
