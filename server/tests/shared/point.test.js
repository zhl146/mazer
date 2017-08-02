"use strict";
let test = require('tape');
let Point = require('../../../shared/Point');

class PointTest {
    constructor(){
        
    }

    valueStorageTest(assert){
        let samplePoint = new Point.default(10, 10);
        assert.equal(samplePoint.x, 10);
        assert.equal(samplePoint.y, 10);
        assert.end();
    }

    parentTest(assert){
        let samplePointA = new Point.default(10, 10);
        let samplePointB = new Point.default(10, 11);
        samplePointA.setParent(samplePointB);
        assert.equal(samplePointB.matches(samplePointA.parent), true);
        assert.end();
    }

    copyTest(assert){
        let samplePointA = new Point.default(10, 10);
        let samplePointB = samplePointA.copy();
        assert.equal(samplePointB.matches(samplePointA), true);
        assert.end();
    }

    setFGHTest(assert){
        let samplePointA = new Point.default(10, 10);
        samplePointA.g = 15;
        let samplePointB = new Point.default(12, 12);
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
