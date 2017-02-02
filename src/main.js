import React from "react"
import ReactDOM from "react-dom"
import AppContainer from "./containers/App"
import createStore from "./store/createStore"

// store and history instantiation
// ==========

// Create redux store and sync with react-router-redux. We have installed the
// react-router-redux reducer under the routerKey "router" in src/routes/index.js,
// so we need to provide a custom `selectLocationState` to inform
// react-router-redux of its location.
const initialState = window.___INITIAL_STATE__;
const store = createStore(initialState);

// render setup
// ==========

const MOUNT_NODE = document.getElementById("root");

let render = ()=> {
	// dynamically require routes, so hot-reloading grabs new versions after each recompile
	const routes = require("./routes/index").default(store);
	ReactDOM.render(<AppContainer store={store} routes={routes}/>, MOUNT_NODE);
}

// developer tools setup
// ==========

if (__DEV__) {
	if (window.devToolsExtension) {
		// window.devToolsExtension.open()
	}
}

// this code is excluded from production bundle
if (__DEV__) {
	if (module.hot) {
		// Development render functions
		const renderApp = render;
		const renderError = error=> {
			const RedBox = require("redbox-react").default

			ReactDOM.render(<RedBox error={error}/>, MOUNT_NODE)
		};

		// Wrap render in try/catch
		render = ()=> {
			try {
				renderApp()
			} catch (error) {
				renderError(error)
			}
		};

		// Setup hot module replacement
		module.hot.accept("./routes/index", () => {
			setTimeout(()=> {
				ReactDOM.unmountComponentAtNode(MOUNT_NODE);
				render();
			});
		});
	}
}

// go!
// ==========

render();