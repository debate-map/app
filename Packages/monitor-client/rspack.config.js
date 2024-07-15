const rspack = require("@rspack/core");
const {DefinePlugin} = require("@rspack/core");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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
    extensionAlias: {
      ".js": [".ts", ".js", ".tsx", ".jsx"],
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
                  decorators: true,
                },
              },
            },
        	},
        ],
    	},
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
        	// extracts CSS into a separate file (with a <link> entry then being inserted into index.html, for runtime loading of it)
        	MiniCssExtractPlugin.loader,
        	// translates CSS into CommonJS
        	{
            loader: "css-loader",
            options: {
              url: false,
            	//minimize: false, // cssnano already minifies
            },
        	},
        	// is this needed? (I mean, I think it applies css minification, but that's not so important for a 13kb-over-CDNed-network file)
        	{
            loader: "postcss-loader",
        	},
        	// compiles Sass to CSS
        	{
            loader: "sass-loader",
            options: {
              sassOptions: {
                includePaths: ["./Source"],
              },
              additionalData: (content, loaderContext)=>{
              	// More information about available properties https://webpack.js.org/api/loaders/
              	const {resourcePath, rootContext} = loaderContext;
              	//const relativePath = path.relative(rootContext, resourcePath);
              	console.log(
                  `Sass-loader preprocessing. @resourcePath:${resourcePath}`,
              	);
              	//console.log(`Content:${content}`);

              	//if (resourcePath.includes("node_modules/web-vcore") && resourcePath.endsWith("Main.scss") && wvcSymlinked) {
              	/*const startPoint = content.indexOf("// [StartOfWVCMainSCSS]");
                  const endPoint = content.includes("// [EndOfWVCMainSCSS]") ? content.indexOf("// [EndOfWVCMainSCSS]") + "// [EndOfWVCMainSCSS]".length : -1;
                  // if wvc Main.scss file is part of this content instance, and wvc is symlinked, replace its top-level subdep imports with ones under wvc folder
                  if (startPoint != -1 && endPoint != -1 && wvcSymlinked) {
                    console.log("Found wvc Main.scss file. Applying fixes, since wvc is symlinked.");
                    const wvcPart = content.slice(startPoint, endPoint);
                    const wvcPart_fixed = wvcPart.replace(/@import "~/g, "@import \"~web-vcore/node_modules/");
                    return content.slice(0, startPoint) + wvcPart_fixed + content.slice(endPoint);
                  }*/

              	//console.log("Includes uPlot css?:", content.includes(".u-legend th"));

              	// if (
              	// 	content.includes(
              	// 		"web-vcore/Source/Utils/Styles/Entry_Base.scss",
              	// 	) &&
              	//   wvcSymlinked
              	// ) {
              	// 	return content.replace(
              	// 		/Styles\/Entry_Base.scss/g,
              	// 		"Styles/Entry_Symlinked.scss",
              	// 	);
              	// }

              	return content;
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
  	new MiniCssExtractPlugin(),
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