const rspack = require("@rspack/core");
const path = require("path");

/** @type {import('@rspack/core').Configuration} */
const config = {
  name: "client",
  mode: "development",
  optimization: {
    moduleIds: "named",
    usedExports: false,
    concatenateModules: false,
  },
  devServer: {
    devMiddleware: {
      stats: {
        colors: true,
        chunks: false, // only on prod,
        chunkModules: false, // only on prod,
      },
      writeToDisk: true,
    },
    port: 5131,
    static: [
    	{
        directory: path.resolve(__dirname, "./Resources"),
    	},
    ],
    historyApiFallback: true,
  },
  target: "web",
  devtool: "source-map",
  resolve: {
    roots: [path.resolve(__dirname, "./Resources")],
    modules: [
    	"node_modules",
    	path.resolve(__dirname, "./Resources"),
    	path.resolve(__dirname, "./Source"),
    ],
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
    alias: {
      fs: path.resolve(__dirname, "../../stream-browserify/index.js"),
      "wavesurfer.js": [path.resolve(__dirname, "../../node_modules/wavesurfer.js/dist/wavesurfer.min.js")],
    },
    extensionAlias: {
      ".js": [".ts", ".js", ".tsx", ".jsx"],
    },
    fallback: {
      stream: path.resolve(__dirname, "../../stream-browserify/index.js"),
      fs: path.resolve(__dirname, "../../stream-browserify/index.js"),
    },
    tsConfig: {
      configFile: path.resolve(__dirname, "./tsconfig.json"),
      references: [path.resolve(__dirname, "../../tsconfig.base.json")],
    },
  },
  experiments: {
    css: true,
  },
  module: {
    rules: [
    	{
        test: /\.(ts?|tsx?|.js)$/,
        use: [
        	{
            loader: "builtin:swc-loader",
            /**
             * @type {import('@rspack/core').SwcLoaderOptions}
             */
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  decorators: true,
                },
              },
            },
        	},
        ],
    	},
    	{
        test: /\.(sa|sc|c)ss$/,
        use: [
        	{
            loader: "sass-loader",
            options: {
              sassOptions: {
                includePaths: [path.resolve(__dirname, "./Source")],
              },
            },
        	},
        ],
        type: "css",
    	},
    	{
        test: /\.woff(\?.*)?$/,
        type: "asset/inline",
    	},
    	{
        test: /\.woff2(\?.*)?$/,
        type: "asset/inline",
    	},
    	{
        test: /\.otf(\?.*)?$/,
        type: "asset/resource",
    	},
    	{
        test: /\.ttf(\?.*)?$/,
        type: "asset/inline",
    	},
    	{
        test: /\.eot(\?.*)?$/,
        type: "asset/resource",
    	},
    	{
        test: /\.(png|jpg)$/,
        type: "asset/inline",
    	},
    	{
        test: /\.svg$/,
        loader: "svg-sprite-loader",
    	},
    ],
  },
  externals: {fs: "root location"},
  entry: {
    app: [path.resolve(__dirname, "./Source/Main.ts")],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "./Dist"),
  },
  plugins: [
  	new rspack.HtmlRspackPlugin({
      template: "./Source/index.html",
      filename: "index.html",
      inject: "body",
      minify: false,
  	}),
  	new rspack.ProgressPlugin({}),
  	new rspack.DefinePlugin({
      "globalThis.ENV": '"dev"',
      "globalThis.DEV": "true",
      "globalThis.PROD": "false",
      "globalThis.TEST": "false",
      ENV: '"dev"',
      DEV: "true",
      PROD: "false",
      TEST: "false",
      NODE_ENV: '"development"',
      "process.env": {NODE_ENV: '"development"'},
      __DEV__: "true",
      __PROD__: "false",
      __TEST__: "false",
  	}),
  ],
};

module.exports = config;