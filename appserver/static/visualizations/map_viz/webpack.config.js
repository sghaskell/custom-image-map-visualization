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
    module: {
        loaders: [
            {
                test: /Leaflet\.Coordinates-0\.1\.5\.src\.js$/,
                loader: 'imports-loader?L=leaflet'
            },
        ]
    },
    externals: [
        'vizapi/SplunkVisualizationBase',
        'vizapi/SplunkVisualizationUtils'
    ]
};
