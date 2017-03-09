// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import Navbar from "./containers/Navbar";
import "./styles/core.scss";
import Home from "./routes/Home";
import LoginRoute from "./routes/Login";
import SignupRoute from "./routes/Signup";
import ProjectsRoute from "./routes/Projects";
import AccountRoute from "./routes/Account";
//import {BaseComponent} from "./Frame/UI/ReactGlobals";
import {Component as BaseComponent} from "react";

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
				<div>
					{children}
				</div>
			</div>
		);
	}
}

export default function createRoutes(store) {
	return {
		path: "/",
		component: RootUI,
		indexRoute: Home,
		childRoutes: [
			AccountRoute(store),
			LoginRoute(store),
			SignupRoute(store),
			ProjectsRoute(store)
		]
	};
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