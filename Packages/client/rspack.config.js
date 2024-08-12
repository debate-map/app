const rspack = require("@rspack/core");
const path = require("path");

const ENV_LONG = process.env.NODE_ENV;
const ENV = ENV_LONG === "production" ? "prod" : "dev";

const QUICK = process.env.QUICK == "true";
const PROD = ENV == "prod";
const DEV = ENV == "dev";
const TEST = ENV == "test";

const OUTPUT_PATH = path.resolve(__dirname, "./Dist");

/** @type {import('@rspack/core').Configuration} */
const config = {
  name: "client",
  mode: PROD && !QUICK ? "production" : "development",
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
    port: 5101,
    static: [
    	{
        directory: path.resolve(__dirname, "./Resources"),
    	},
    ],
    historyApiFallback: {
      index: "index.html",
      verbose: true,
      rewrites: [
      	{
          from: /^\/.*$/,
          to(context) {
          	if (context.parsedUrl.pathname.match(/\.[a-z]+$/)) {
          		return `/${context.parsedUrl.pathname.split("/").pop()}`;
          	}
          	return "/index.html";
          },
      	},
      ],
    },
  },
  target: "web",
  devtool: PROD ? "source-map" : "cheap-source-map",
  resolve: {
    roots: [path.resolve(__dirname, "./Resources")],
    modules: [
    	"node_modules",
    	path.resolve(__dirname, "./Resources"),
    	path.resolve(__dirname, "./Source"),
    ],
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
    alias: {
      "wavesurfer.js": [path.resolve(__dirname, "../../node_modules/wavesurfer.js/dist/wavesurfer.js")],
    },
    extensionAlias: {
      ".js": [".ts", ".js", ".tsx", ".jsx"],
    },
    fallback: {
      fs: path.resolve(__dirname, "../../node_modules/stream-browserify/index.js"),
      stream: path.resolve(__dirname, "../../node_modules/stream-browserify/index.js"),
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
              // using `modern-compiler` and `sass-embedded` together significantly improve build performance
              api: "modern-compiler",
              implementation: require.resolve("sass-embedded"),

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
  externals: {
    fs: "root location",
    "/Fonts/AdobeNotDef-Regular.otf": "root location",
  },
  entry: {
    app: [path.resolve(__dirname, "./Source/Main.ts")],
  },
  output: {
    filename: "[name].js",
    path: OUTPUT_PATH,
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
      // all compile-time instances of these fields get replaced with constants
      "globalThis.ENV": ENV,
      "globalThis.DEV": DEV,
      "globalThis.PROD": PROD,
      "globalThis.TEST": TEST,
      // in the root project, the `globalThis.` part may be left out
      ENV,
      DEV,
      PROD,
      TEST,

      // DON'T EVER USE THESE (use ones above instead -- to be consistent); we only include them in case libraries use them (such as redux)
      // ==========

      NODE_ENV: ENV_LONG ?? undefined,
      // this version is needed, for "process.env.XXX" refs from libs we don't care about (else runtime error)
      "process.env.NODE_ENV": ENV_LONG,

      //"process.env.NODE_ENV": ENV_Long)), // edit: why the above, instead of this?
      ...{
        __DEV__: DEV,
        __PROD__: PROD,
        __TEST__: TEST,
      },
  		//"__COVERAGE__": !argv.watch ? S(TEST) : null,
  		//"__BASENAME__": S(BASENAME),
  	}),
  	new rspack.CopyRspackPlugin({
      patterns: [
      	{
          from: path.resolve(__dirname, "./Resources"),
          to: OUTPUT_PATH,
          globOptions: {
            ignore: ["**/index.html"],
          },
      	},
      ],
  	}),
  ],
};

module.exports = config;