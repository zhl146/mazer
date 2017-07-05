
import Maze from './';
import queue from 'queuejs'

function PointSet()
{
    this.set = {};
}

PointSet.prototype.add(point) {
    if (!set[point.x]) set[point.x] = {};
    set[point.x][point.y] = true;
}

PointSet.prototype.has(x, y) {
    return (set[point.x] && set[point.x][point.y]);
}

PointSet.prototype.del(point.x, point.y) {
    if (!set[point.x]) return;
    delete set[point.x][point.y];
}

export default function Pathfinder(maze)
{
    this.maze = maze;
}

Pathfinder.prototype.FindPath = function(start, end) {
    if (!maze.contains(start)) {
        console.log("Maze does not contain start point", start);
        return null;
    }

    if (!maze.contains(end)) {
        console.log("Maze does not contain end point", end);
        return null;
    }

    return null;
}
