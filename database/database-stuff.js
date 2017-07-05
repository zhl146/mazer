/* there are cats here for now, but we will add leaderboard later */

(function () {

    var mongoose = require('mongoose');
    mongoose.Promise = global.Promise;

    mongoose.connect('mongodb://localhost:27017/database');

    var db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        console.log('connected')
        var kittySchema = mongoose.Schema({
            name: String
        });

        kittySchema.methods.speak = function () {
            var greeting = this.name
                ? "Meow name is " + this.name
                : "I don't have a name";
            console.log(greeting);
        }

        var Kitten = mongoose.model('Kitten', kittySchema);

        var silence = new Kitten({ name: 'Silence' });
        console.log(silence.name); // 'Silence'

        var fluffy = new Kitten({ name: 'fluffy' });
        fluffy.speak(); // "Meow name is fluffy"

        fluffy.save(function (err, fluffy) {
            if (err) return console.error(err);
            fluffy.speak();
        });
    });

})
