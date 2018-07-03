import mongodb from "mongodb";

const MongoClient = mongodb.MongoClient;

// Connection URL
const url = "mongodb://localhost:27017";

let Mongo = {
    scores: null,
    connect: () =>
        new Promise(resolve => {
            MongoClient.connect(
                url,
                { useNewUrlParser: true },
                (err, client) => {
                    console.log("Connected successfully to server");

                    Mongo.scores = client
                        .db("mazer_scores")
                        .collection("scores");
                    resolve(client);
                }
            );
        })
};

export default Mongo;
