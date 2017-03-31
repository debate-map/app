import {VMenuLayer} from "react-vmenu";
// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import "./Frame/Styles/Core.scss";
import {BaseComponent, AddGlobalStyle} from "./Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import ScrollView from "react-vscrollview";
import getMuiTheme from "material-ui/styles/getMuiTheme";
// Themeing/Styling
import Theme from "./theme";

//import {BrowserRouter as Router, Route, browserHistory} from "react-router-dom";
import {Route} from "react-router";
import {ConnectedRouter as Router, routerReducer, routerMiddleware, push} from "react-router-redux";
//import createHistory from "history/lib/createBrowserHistory";
import {createBrowserHistory} from "react-router/node_modules/history";

import {Provider, connect} from "react-redux";
import Modal from "react-modal";
import GlobalUI from "./UI/Global";

import MoreUI from "./UI/More";
import AdminUI from "./UI/More/Admin";
import RootUI2 from "./UI/Root";
import {GetUrlPath, E} from "./Frame/General/Globals_Free";
import {MessageBoxOptions, ACTMessageBoxShow, MessageBoxUI} from "./Frame/UI/VMessageBox";
import Button from "./Frame/ReactComponents/Button";
import Navbar from "./UI/@Shared/Navbar";

// Create a history of your choosing (we're using a browser history in this case)
const history = createBrowserHistory();

export default class RootUIWrapper extends BaseComponent<{store}, {}> {
	render() {
		let {store} = this.props;
		return (
			<Provider store={store}>
				<Router history={history}>
					<RootUI/>
				</Router>
			</Provider>
		);
	}
}

class RootUI extends BaseComponent<{}, {}> {
	render() {
		let pages = [
			"stream", "chat",
			"users", "forum", "social", "more",
			"terms", "personal", "debates", "global",
			"search", "profile"
		];
		return (
			<div className="unselectable" style={{
				height: "100%", display: "flex", flexDirection: "column",
				//background: "rgba(0,0,0,1)",
				background: "url(/Images/Backgrounds/Nebula.jpg)", backgroundPosition: "center center", backgroundSize: "cover",
				//background: "rgba(0,0,0,1)",
			}}>
				{/*<div style={{
					position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: .5,
					background: "url(/Images/Backgrounds/Nebula.jpg)", backgroundPosition: "center center", backgroundSize: "cover",
				}}/>*/}
				<OverlayUI/>
				<Navbar/>
				<div style={{position: "relative", flex: "1 1 100%", overflow: "hidden"}}>
					{/*<Route exact path="/" component={RootUI2}/>
					<Route exact path="/about" component={RootUI2}/>*/}
					{!GetUrlPath().StartsWithAny(...pages) && <RootUI2/>}

					<Route path="/stream" component={()=><div/>}/>
					<Route path="/chat" component={()=><div/>}/>

					<Route path="/users" component={()=><div/>}/>
					<Route path="/forum" component={()=><div/>}/>
					<Route path="/social" component={()=><div/>}/>
					<Route path="/more" component={MoreUI}/>

					<Route path="/terms" component={()=><div/>}/>
					<Route path="/personal" component={()=><div/>}/>
					<Route path="/debates" component={()=><div/>}/>
					<Route path="/global" component={GlobalUI}/>

					<Route path="/search" component={()=><div/>}/>
					<Route path="/profile" component={()=><div/>}/>
				</div>
			</div>
		);
	}
}

class OverlayUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div style={{position: "absolute"}}>
				<MessageBoxUI/>
				<VMenuLayer/>
			</div>
		);
	}
}