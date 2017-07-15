const debug = false;

const debugEndpoint = 'http://localhost:3000';
const prodEndpoint = 'https://zhenlu.info/maze';

export default function MazeService( apiLocation ) {
    if (apiLocation !== undefined) {
        this.apiLocation = apiLocation;
        return;
    }

    if (debug) {
        this.apiLocation = debugEndpoint;
    } else {
        this.apiLocation = prodEndpoint;
    }
};

MazeService.prototype.getScores = function ( seed, start, length ) {
    const path = '/leaderboard/' + seed + '?start=' + start + '&length=' + length;
    let promise = this.makeApiPromise(path, "GET", null);

    return promise.then(function ( response ) {
        return Promise.resolve(response.scores);
    });
};

MazeService.prototype.submitSolution = function ( seed, name, diffPoints ) {
    const data = {
        "seed": seed,
        "name": name,
        "diffPoints": diffPoints
    };

    const path = '/maze/check';
    let promise = this.makeApiPromise(path, "POST", data);

    return promise.then(function ( response ) {
        return Promise.resolve(response.rank);
    });
};

MazeService.prototype.getDailySeed = function () {
    const path = '/maze';
    const promise = this.makeApiPromise(path, "GET", null);

    return promise.then(function ( response ) {
        return Promise.resolve(response.seed);
    });
};

// Makes a promise which sends an api call to the path using an HTTP method.
//  path - Path to append to this.apiLocation.
//  method - HTTP method.
//  data - The data to send, in the form of a javascript object which is JSONified.
MazeService.prototype.makeApiPromise = function ( path, method, data ) {
    return new Promise(function ( resolve, reject ) {
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'json';

        const url = this.apiLocation + path;
        xhr.open(method, url, true);

        if (data !== null) {
            xhr.setRequestHeader("Content-Type", "application/json");
        }

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };

        xhr.onerror = function () {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        };

        xhr.send(JSON.stringify(data));
    }.bind(this));
};
