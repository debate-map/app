import ReactDOM from "react-dom";
import createStore from "./store/createStore";

// store and history instantiation
// ==========

// Create redux store and sync with react-router-redux. We have installed the
// react-router-redux reducer under the routerKey "router" in src/routes/index.js,
// so we need to provide a custom `selectLocationState` to inform
// react-router-redux of its location.
const initialState = window.___INITIAL_STATE__;
const store = createStore(initialState);

// wrapper ui
// ==========

import React, {Component, PropTypes} from "react";
import {browserHistory, Router} from "react-router";
import {Provider} from "react-redux";

// Themeing/Styling
import Theme from "./theme";
import getMuiTheme from "material-ui/styles/getMuiTheme";

// Tap Plugin
import injectTapEventPlugin from "react-tap-event-plugin";
injectTapEventPlugin();

export default class WrapperUI extends Component {
	static childContextTypes = {
		muiTheme: PropTypes.object
	};
	static propTypes = {
		routes: PropTypes.object.isRequired,
		store: PropTypes.object.isRequired
	};

	getChildContext() {
		return {muiTheme: getMuiTheme(Theme)};
	}

	render() {
		const {routes, store} = this.props;
		return (
			<Provider store={store}>
				<div style={{height: "100%"}}>
					<Router history={browserHistory} children={routes}/>
				</div>
			</Provider>
		);
	}
}

// render setup
// ==========

const mountNode = document.getElementById("root");
function RenderWrapper() {
	try {
		// dynamically require routes, so hot-reloading grabs new versions after each recompile
		const routes = require("./RootUI").default(store);
		ReactDOM.render(<WrapperUI store={store} routes={routes}/>, mountNode);
	} catch (error) {
		if (__DEV__) {
			const RedBox = require("redbox-react").default;
			ReactDOM.render(<RedBox error={error}/>, mountNode);
			return;
		}
		throw error;
	}
}

// developer tools setup
// ==========

// this code is excluded from production bundle
if (__DEV__) {
	/*if (window.devToolsExtension)
		window.devToolsExtension.open();*/
	if (module.hot) {
		// Setup hot module replacement
		module.hot.accept("./RootUI", () => {
			setTimeout(()=> {
				ReactDOM.unmountComponentAtNode(mountNode);
				RenderWrapper();
			});
		});
	}
}

// go!
// ==========

RenderWrapper();