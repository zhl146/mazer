import express from "express";
import path from "path";
import logger from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import compression from "compression";
import maze from "./routes/maze";
import leaderboard from "./routes/leaderboard";
import bodyParser from "body-parser";
import sleep from "sleep";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";

mongoose.Promise = global.Promise;

const uri = process.env.RUNTIME ? "mongodb" : "localhost";
let success = true;
let database = null;
for (let i = 0; i < 5; i++) {
    try {
        console.log("HI, sleeping before connecting to the DB!");
        sleep.sleep(5);
        if (database) {
            console.log("connected to the DB");
            break;
        }
        database = mongoose
            .connect("mongodb://" + uri + "/mazer_scores_DB", {
                server: { reconnectTries: 10 }
            })
            .catch(ex => {
                console.log(ex);
            });
    } catch (ex) {
        console.log(ex);
    }
}

if (!database) throw Error("Could not connect to MongoDB!");

let app = express();
app.use(function(err, req, res, next) {
    console.log(err.stack);
    res.status(500).send("Something broke!");
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
//app.set('view engine', 'jade');

app.use(logger("dev"));
app.use(compression());
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/maze", maze);
app.use("/leaderboard", leaderboard);
app.use("/mazer-api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// catch 404 and forward to error handler
/*app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send("404");
});*/

export default app;
