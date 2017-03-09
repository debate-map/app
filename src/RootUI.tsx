// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import Navbar from "./containers/Navbar";
import "./styles/core.scss";
import {BaseComponent} from "./Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
//import ScrollView from "react-free-scrollbar";
var ScrollView = require("react-free-scrollbar").default;

import getMuiTheme from "material-ui/styles/getMuiTheme";
// Themeing/Styling
import Theme from "./theme";
import {Route, Router, IndexRoute, browserHistory} from "react-router";
import {Provider} from "react-redux";

import Home from "./routes/Home";
import GlobalMap from "./routes/GlobalMap";

import LoginRoute from "./routes/Login";
import SignupRoute from "./routes/Signup";
import ProjectsRoute from "./routes/Projects";
import AccountRoute from "./routes/Account";

export default class RootUIWrapper extends BaseComponent<{store}, {}> {
	static childContextTypes = {
		muiTheme: PropTypes.object
	};
	
	getChildContext() {
		return {muiTheme: getMuiTheme(Theme)};
	}

	render() {
		let {store} = this.props;
		return (
			<Provider store={store}>
				<div style={{height: "100%"}}>
					<Router history={browserHistory}>
						<Route path="/" component={RootUI}>
							<IndexRoute component={Home}/>
							<Route path="community" component={()=><div/>}/>
							<Route path="forum" component={()=><div/>}/>
							<Route path="terms" component={()=><div/>}/>
							<Route path="global-map" component={GlobalMap}/>
							<Route path="debate-maps" component={()=><div/>}/>
							<Route path="personal-maps" component={()=><div/>}/>
						</Route>
					</Router>
				</div>
			</Provider>
		);
	}
}

class RootUI extends BaseComponent<{}, {}> {
	static propTypes = {
		children: PropTypes.element.isRequired
	};

	render() {
		var {children} = this.props;
		return (
			<div style={{
				height: "100%",
				//background: "rgba(0,0,0,1)",
				background: "url(/Images/Backgrounds/Nebula.jpg)", backgroundPosition: "center center", backgroundSize: "cover",
			}}>
				<Navbar/>
				<ScrollView style={{height: "calc(100% - 45px)"}} scrollVBarStyles={{width: 10}}>
					{children}
				</ScrollView>
			</div>
		);
	}
}

/* Note: childRoutes can be chunked or otherwise loaded programmatically using getChildRoutes with the following signature:

getChildRoutes(location, cb) {
	require.ensure([], require=> {
			cb(null, [
			// Remove imports!
			require("./Counter").default(store)
		])
	})
}

However, this is not necessary for code-splitting! It simply provides an API for async route definitions.
Your code splitting should occur inside the route `getComponent` function, since it is only invoked when the route exists and matches.*/