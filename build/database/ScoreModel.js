'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var scoreSchema = _mongoose2.default.Schema({
    name: String,
    score: Number,
    date: String,
    solution: Array
});

var ScoreModel = _mongoose2.default.model('ScoreModel', scoreSchema);

exports.default = ScoreModel;