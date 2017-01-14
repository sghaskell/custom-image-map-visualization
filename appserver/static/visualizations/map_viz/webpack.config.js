var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: 'map_viz',
    resolve: {
        root: [
            path.join(__dirname, 'src'),
        ]
    },
    output: {
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    module: {
        loaders: [
            {
                test: /leaflet\.awesome-markers\.js$/,
                loader: 'imports-loader?L=leaflet'
            },
        ]
    },
    externals: [
        'vizapi/SplunkVisualizationBase',
        'vizapi/SplunkVisualizationUtils'
    ]
};
