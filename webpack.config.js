/* eslint-disable */
const path = require("path");

const makeConfig = (argv, { entry, target = "node", libraryTarget = "commonjs", dist = "dist", externals = {} }) => ({
    mode: argv.mode,
    devtool: argv.mode === "production" ? false : "source-map",
    target,

    entry,

    output: {
        path: path.resolve(__dirname, dist),
        filename: "[name].js",
        libraryTarget,
        globalObject: "this",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },

    externals: {
        vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/,
        ...externals
    },

    module: {
        rules: [{
            test: /\.css$/i,
            use: ["style-loader", "css-loader"],
        }, {
            test: /\.js$/,
            use: ["source-map-loader"],
            enforce: "pre"
        }]
    },

    resolve: {
        fallback: {
            "@hpcc-js": path.resolve(__dirname, "../hpcc-js/packages"),
            assert: require.resolve('assert'),
            buffer: require.resolve('buffer'),
            // console: require.resolve('console-browserify'),
            // constants: require.resolve('constants-browserify'),
            // crypto: require.resolve('crypto-browserify'),
            // domain: require.resolve('domain-browser'),
            // events: require.resolve('events'),
            // http: require.resolve('stream-http'),
            // https: require.resolve('https-browserify'),
            os: require.resolve('os-browserify/browser'),
            path: require.resolve('path-browserify'),
            // punycode: require.resolve('punycode'),
            // process: require.resolve('process/browser'),
            // querystring: require.resolve('querystring-es3'),
            stream: require.resolve('stream-browserify'),
            // string_decoder: require.resolve('string_decoder'),
            // sys: require.resolve('util'),
            // timers: require.resolve('timers-browserify'),
            // tty: require.resolve('tty-browserify'),
            // url: require.resolve('url'),
            // util: require.resolve('util'),
            // vm: require.resolve('vm-browserify'),
            zlib: require.resolve('browserify-zlib')
        }
    },

    experiments: {
        outputModule: libraryTarget === "module"
    },

    plugins: [],

    performance: {
        hints: false
    }
});

module.exports = (env, argv) => [
    makeConfig(argv, {
        entry: {
            extension: "./lib-es6/extension.js",
            debugger: "./lib-es6/debugger.js"
        }
    }),
    makeConfig(argv, {
        entry: {
            "extension": "./lib-es6/web-extension.js"
        },
        target: "webworker",
        dist: "dist-web",
        externals: {
            fs: "commonjs fs"
        }
    }),
    makeConfig(argv, {
        entry: {
            eclwatch: "./lib-es6/eclwatch.js",
            renderer: "./lib-es6/renderer.js"
        },
        target: "web",
        libraryTarget: "module"
    })
];
