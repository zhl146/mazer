import Maze from "./Maze";

function Score( name, diffPoints, date) {
    this.name = name;
    this.diffPoints = diffPoints;
    this.date = date;
    this.score = this.calculateScore()
}

Score.prototype.calculateScore = function() {
    var currentMaze = new Maze(this.date);

};