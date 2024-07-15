module.exports = 
    {
        name: 'monitor-client',
        mode: 'development',
        optimization: {
          emitOnErrors: false,
          moduleIds: 'named',
          usedExports: false,
          concatenateModules: false
        },
        target: 'web',
        devtool: 'cheap-source-map',
        resolve: {
          modules: [
            'node_modules',
            'C:\\dev\\app\\Packages\\monitor-client\\Source_JS'
          ],
          extensions: [ '.js', '.jsx', '.json', '.ts', '.tsx', '.mjs' ],
          alias: {
            react: 'C:\\dev\\app\\node_modules\\react',
            'web-vcore/.yalc/react': 'never_import_from_the_yalc_folder_directly',
            'react-dom': 'C:\\dev\\app\\node_modules\\react-dom',
            'web-vcore/.yalc/react-dom': 'never_import_from_the_yalc_folder_directly',
            mobx: 'C:\\dev\\app\\node_modules\\mobx',
            'web-vcore/.yalc/mobx': 'never_import_from_the_yalc_folder_directly',
            'mobx-react': 'C:\\dev\\app\\node_modules\\mobx-react',
            'web-vcore/.yalc/mobx-react': 'never_import_from_the_yalc_folder_directly',
            'js-vextensions': 'C:\\dev\\app\\node_modules\\js-vextensions',
            'web-vcore/.yalc/js-vextensions': 'never_import_from_the_yalc_folder_directly',
            'react-vextensions': 'C:\\dev\\app\\node_modules\\react-vextensions',
            'web-vcore/.yalc/react-vextensions': 'never_import_from_the_yalc_folder_directly',
            'react-vcomponents': 'C:\\dev\\app\\node_modules\\react-vcomponents',
            'web-vcore/.yalc/react-vcomponents': 'never_import_from_the_yalc_folder_directly',
            'react-vmenu': 'C:\\dev\\app\\node_modules\\react-vmenu',
            'web-vcore/.yalc/react-vmenu': 'never_import_from_the_yalc_folder_directly',
            'react-vmessagebox': 'C:\\dev\\app\\node_modules\\react-vmessagebox',
            'web-vcore/.yalc/react-vmessagebox': 'never_import_from_the_yalc_folder_directly',
            'react-vscrollview': 'C:\\dev\\app\\node_modules\\react-vscrollview',
            'web-vcore/.yalc/react-vscrollview': 'never_import_from_the_yalc_folder_directly',
            'react-vmarkdown': 'C:\\dev\\app\\node_modules\\react-vmarkdown',
            'web-vcore/.yalc/react-vmarkdown': 'never_import_from_the_yalc_folder_directly',
            'mobx-graphlink': 'C:\\dev\\app\\node_modules\\mobx-graphlink',
            'web-vcore/.yalc/mobx-graphlink': 'never_import_from_the_yalc_folder_directly',
            'web-vcore': 'C:\\dev\\app\\node_modules\\web-vcore',
            'web-vcore/.yalc/web-vcore': 'never_import_from_the_yalc_folder_directly',
            'webpack-runtime-require': 'C:\\dev\\app\\node_modules\\webpack-runtime-require',
            'web-vcore/.yalc/webpack-runtime-require': 'never_import_from_the_yalc_folder_directly',
            immer: 'C:\\dev\\app\\node_modules\\immer',
            'web-vcore/.yalc/immer': 'never_import_from_the_yalc_folder_directly'
          },
          fallback: {
            stream: 'C:\\dev\\app\\node_modules\\stream-browserify\\index.js'
          }
        },
        module: { rules: [ [Object], [Object], [Object], [Object], [Object] ] },
        externals: { fs: 'root location' },
        entry: {
          app: [ 'C:\\dev\\app\\Packages\\monitor-client\\Source_JS\\Main.js' ]
        },
        output: {
          filename: '[name].js?[hash]',
          path: 'C:\\dev\\app\\Packages\\monitor-client\\Dist',
          publicPath: '/monitor/',
          pathinfo: true
        },
        snapshot: {
          managedPaths: [ /^(.+?[\\/]node_modules[\\/](?!())(@.+?[\\/])?.+?)[\\/]/ ]
        },
        plugins: [
          [Function (anonymous)],
          DefinePlugin { definitions: [Object] },
          HtmlWebpackPlugin {
            userOptions: [Object],
            version: 5,
            options: [Object]
          },
          WebpackStringReplacer { options: [Options] },
          MiniCssExtractPlugin {
            _sortedModulesCache: [WeakMap],
            options: [Object],
            runtimeOptions: [Object]
          },
          IgnoreNotFoundExportPlugin {},
          SVGSpritePlugin {
            config: [Object],
            factory: [Function (anonymous)],
            svgCompiler: [Compiler],
            rules: {}
          },
          DuplicatePackageCheckerPlugin { options: [Object] }
        ]
      }
