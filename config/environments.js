// Here is where you can define configuration overrides based on the execution environment.
// Supply a key to the default export matching the NODE_ENV that you wish to target, and
// the base configuration will apply your overrides before exporting itself.
module.exports = {
	// Overrides when NODE_ENV === "development"
	// ==========

	// NOTE: In development, we use an explicit public path when the assets
	// are served webpack by to fix this issue:
	// http://stackoverflow.com/questions/34133808/webpack-ots-parsing-error-loading-fonts/34133809#34133809
	development: config=> ({
		compiler_public_path: `http://${config.server_host}:${config.server_port}/`,
		firebase: {
			apiKey: "AIzaSyB1UCTO2p6TLpifAQzsRw_Np39k9N92cpI",
			authDomain: "debate-map-dev.firebaseapp.com",
			databaseURL: "https://debate-map-dev.firebaseio.com",
			storageBucket: "debate-map-dev.appspot.com"
		}
	}),

	// Overrides when NODE_ENV === "production"
	// ==========
	
	production: config=> ({
		compiler_public_path: "/",
		compiler_fail_on_warning: false,
		compiler_hash_type: "chunkhash",
		//compiler_devtool: null,
		//compiler_devtool: "cheap-module-source-map",
		compiler_devtool: "source-map",
		compiler_stats: {
			chunks: true,
			chunkModules: true,
			colors: true
		},
		firebase: {
			apiKey: "AIzaSyCnvv_m-L08i4b5NmxGF5doSwQ2uJZ8i-0",
			authDomain: "debate-map-prod.firebaseapp.com",
			databaseURL: "https://debate-map-prod.firebaseio.com",
			storageBucket: "debate-map-prod.appspot.com"
		}
	})
};