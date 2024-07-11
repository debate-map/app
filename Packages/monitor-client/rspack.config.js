const rspack = require("@rspack/core");
const {DefinePlugin} = require("@rspack/core");

/** @type {import('@rspack/core').Configuration} */
const config = {
  name: "monitor-client",
  mode: "development",
  optimization: {
    moduleIds: "named",
    usedExports: false,
    concatenateModules: false,
  },
  devServer: {
    port: 5130,
  },
  target: "web",
  devtool: "cheap-source-map",
  resolve: {
    modules: ["node_modules", "./Source"],
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".mjs"],
    alias: {
      react: "../../node_modules/react",
      "web-vcore/.yalc/react": "never_import_from_the_yalc_folder_directly",
      "react-dom": "../../node_modules/react-dom",
      "web-vcore/.yalc/react-dom": "never_import_from_the_yalc_folder_directly",
      mobx: "../../node_modules/mobx",
      "web-vcore/.yalc/mobx": "never_import_from_the_yalc_folder_directly",
      "mobx-react": "../../node_modules/mobx-react",
      "web-vcore/.yalc/mobx-react":
        "never_import_from_the_yalc_folder_directly",
      "js-vextensions": "../../node_modules/js-vextensions",
      "web-vcore/.yalc/js-vextensions":
        "never_import_from_the_yalc_folder_directly",
      "react-vextensions": "../../node_modules/react-vextensions",
      "web-vcore/.yalc/react-vextensions":
        "never_import_from_the_yalc_folder_directly",
      "react-vcomponents": "../../node_modules/react-vcomponents",
      "web-vcore/.yalc/react-vcomponents":
        "never_import_from_the_yalc_folder_directly",
      "react-vmenu": "../../node_modules/react-vmenu",
      "web-vcore/.yalc/react-vmenu":
        "never_import_from_the_yalc_folder_directly",
      "react-vmessagebox": "../../node_modules/react-vmessagebox",
      "web-vcore/.yalc/react-vmessagebox":
        "never_import_from_the_yalc_folder_directly",
      "react-vscrollview": "../../node_modules/react-vscrollview",
      "web-vcore/.yalc/react-vscrollview":
        "never_import_from_the_yalc_folder_directly",
      "react-vmarkdown": "../../node_modules/react-vmarkdown",
      "web-vcore/.yalc/react-vmarkdown":
        "never_import_from_the_yalc_folder_directly",
      "mobx-graphlink": "../../node_modules/mobx-graphlink",
      "web-vcore/.yalc/mobx-graphlink":
        "never_import_from_the_yalc_folder_directly",
      "web-vcore": "../../node_modules/web-vcore",
      "web-vcore/.yalc/web-vcore": "never_import_from_the_yalc_folder_directly",
      "webpack-runtime-require": "../../node_modules/webpack-runtime-require",
      "web-vcore/.yalc/webpack-runtime-require":
        "never_import_from_the_yalc_folder_directly",
      immer: "../../node_modules/immer",
      "web-vcore/.yalc/immer": "never_import_from_the_yalc_folder_directly",
      pg: false,
      postgraphile: false,
      "graphile-utils": false,
    },
    fallback: {
      stream: "../../stream-browserify/index.js",
    },
    tsConfig: {
      configFile: "./tsconfig.json",
    },
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
                },
              },
            },
        	},
        ],
    	},
    ],
  },
  externals: {fs: "root location"},
  entry: {
    app: ["./Source/Main.tsx"],
  },
  plugins: [
  	new rspack.HtmlRspackPlugin({
      template: "./Source/index.html",
  	}),
  	new DefinePlugin({
      definitions: {
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
      },
  	}),
  ],
};

module.exports = config;