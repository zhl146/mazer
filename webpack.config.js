var path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'public'),
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
        contentBase: path.join(__dirname, 'public'),
        proxy: {
            "/maze": {
                target: "http://localhost:3000",
            }
        }
    }
};

