const path = require('path');

module.exports = {
    entry: './client/src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'client-dist'),
    },

    module: {
        rules: [
        {
            test: /\.scss$/,
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader'
            }, {
                loader: 'sass-loader'
            }]
        }
        ]
    },

    devServer: {
        contentBase: path.join(__dirname, 'client-dist'),
        proxy: {
            "/maze": {
                target: "http://localhost:3000",
            }
        }
    }

};

