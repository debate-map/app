const wp = require('@cypress/webpack-preprocessor');

// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

module.exports = (on, config) => {
	// `on` is used to hook into various events Cypress emits
	// `config` is the resolved Cypress config

	const options = {
		webpackOptions: {
			devtool: 'cheap-source-map',
			resolve: {
				extensions: ['.ts', '.tsx', '.js'],
			},
			module: {
				rules: [
					{
						test: /\.tsx?$/,
						exclude: [/node_modules/],
						use: [
							/* {
								loader: 'babel-loader',
								options: {
									presets: ['@babel/preset-env'],
								},
							}, */
							{
								loader: 'ts-loader',
								options: {
									transpileOnly: true,
									// configFile: 'tsconfig.json',
									// configFile: 'C:/Root/Apps/@V/@Modules/web-vcore/Main/tsconfig.json',
									/* exclude: [
										'Build',
										'Tests',
										'node_modules',
                 				], */
									/* compilerOptions: {
										rootDir: './../..', // need to go higher, to wrap the web-vcore repo as well
									}, */
								},
							},
						],
					},
				],
			},
			externals: {
				// temp; fix for firebase-mock in browser (code-path not actually used, so it's okay)
				fs: 'root location', // redirect to some global-variable, eg. window.location
			},
		},
	};
	on('file:preprocessor', wp(options));
};
