"use strict";
let test = require('tape');
let Mazer = require('../../../shared/Maze');

class MazeTest {
    constructor(){

    }

    mazeConstructorTest(assert){
        let testMaze1 = new Mazer.default(3000);
        let testMaze2 = new Mazer.default(3000);
        assert.notEqual(testMaze1.random, null, 'testmaze 1 has a valid random value');
        assert.equal(testMaze1.random(), testMaze2.random(), 'testmaze 1 and testmaze 2 generate the same random number given the same seed');
        assert.end();
    }

    unitTests(){
        test('testing the constructor for mazer', this.mazeConstructorTest);
        
    }
}

module.exports = MazeTest;