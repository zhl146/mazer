
export default function MazeService(apiLocation) {
    if (apiLocation === undefined) {
        this.apiLocation = 'http://localhost:3000';
    } else {
        this.apiLocation = apiLocation;
    }
};

MazeService.prototype.getScores = function(seed, start, length) {
    var path = '/leaderboard/' + seed + '?start=' + start + '&length=' + length;
    var promise = this.makeApiPromise(path, "GET", null);

    return promise.then(function(response) {
        return Promise.resolve(response.scores);
    });
}

MazeService.prototype.submitSolution = function(seed, name, diffPoints) {
    var data = {
        "seed": seed,
        "name": name,
        "diffPoints": diffPoints
    };

    var path = '/maze/check';
    var promise = this.makeApiPromise(path, "POST", data);

    return promise.then(function(response) {
        return Promise.resolve(response.rank);
    });
}

MazeService.prototype.getDailySeed = function() {
    var path = '/maze';
    var promise = this.makeApiPromise(path, "GET", null);

    return promise.then(function(response) {
        return Promise.resolve(response.seed);
    });
}

// Makes a promise which sends an api call to the path using an HTTP method.
//  path - Path to append to this.apiLocation.
//  method - HTTP method.
//  data - The data to send, in the form of a javascript object which is JSONified.
MazeService.prototype.makeApiPromise = function(path, method, data) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'json';

        var url = this.apiLocation + path;
        xhr.open(method, url, true);

        if (data !== null) {
            xhr.setRequestHeader("Content-Type", "application/json");
        }

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        }

        xhr.onerror = function() {
            reject({
                status: xhr.status,
                statusText: xhr.statusText
            });
        }

        xhr.send(JSON.stringify(data));
    }.bind(this));
}
