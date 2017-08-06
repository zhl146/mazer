"use strict";
let test = require('tape');
let Mazer = require('../../../shared/Maze');

class MazeTest {
    constructor(){

    }

    mazeConstructorTest(assert){
        let testMaze1 = new Mazer.default(3000);
        let testMaze2 = new Mazer.default(3000);
        assert.equal(testMaze1.random != null, true);
        assert.equal(testMaze1.random == testMaze2.random, true);
        assert.end();
    }

    unitTests(){
        test('testing the constructor for mazer', this.mazeConstructorTest);
        
    }
}

module.exports = MazeTest;