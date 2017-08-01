"use strict";
let test = require('tape');
let Point = require('../../../shared/Point');
//let assert = require('assert');

class PointTest {
    constructor(){
        
    }

    unitTests(){
        test('Point Test', function(assert){
            let samplePoint = new Point.default(10, 10);
            assert.equal(samplePoint.x, 10);
            assert.end();
        });

        test('this test should fail', (assert) => {
                assert.equal(false, true);
                assert.end();
            }
        );
    }
}

module.exports = PointTest;


// describe('Point', function() {

//     let samplePoint;

//     beforeEach(() => {
//         samplePoint = new Point(10, 10)
//     });

//     describe('when a point is created', () => {
//         it('should be able to report its coordinates', () => {
//             expect(samplePoint.x).toEqual(11);
//         });
//     });

//     describe('this test should fail', () => {
//         it('should fail', () => {
//                 expect(false).toBe(true);
//             }
//         )

//     })

// });