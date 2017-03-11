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
import {BrowserRouter as Router, Route, browserHistory} from "react-router-dom";
import {Provider} from "react-redux";

import GlobalMap from "./routes/GlobalMap";

import LoginRoute from "./routes/Login";
import SignupRoute from "./routes/Signup";
import ProjectsRoute from "./routes/Projects";
import AccountRoute from "./routes/Account";
import MoreUI from "./routes/More";
import AdminUI from "./routes/More/Admin";
import RootUI2 from "./routes/Root";
import {GetUrlPath} from "./Frame/General/Globals_Free";

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
				<Router>
					<RootUI/>
				</Router>
			</Provider>
		);
	}
}
class RootUI extends BaseComponent<{}, {}> {
	render() {
		let pages = ["forum", "community", "search", "more", "terms", "personal", "debates", "global"];
		return (
			<div style={{
				height: "100%", display: "flex", flexDirection: "column",
				//background: "rgba(0,0,0,1)",
				background: "url(/Images/Backgrounds/Nebula.jpg)", backgroundPosition: "center center", backgroundSize: "cover",
			}}>
				<Navbar/>
				<div style={{position: "relative", flex: "1 1 100%", overflow: "hidden"}}>
					{/*<Route exact path="/" component={RootUI2}/>
					<Route exact path="/about" component={RootUI2}/>*/}
					{!GetUrlPath().StartsWithAny(...pages) && <RootUI2/>}

					<Route path="/forum" component={()=><div/>}/>
					<Route path="/community" component={()=><div/>}/>
					<Route path="/search" component={()=><div/>}/>
					<Route path="/more" component={MoreUI}/>

					<Route path="/terms" component={()=><div/>}/>
					<Route path="/personal" component={()=><div/>}/>
					<Route path="/debates" component={()=><div/>}/>
					<Route path="/global" component={GlobalMap}/>
				</div>
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