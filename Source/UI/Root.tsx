import {VMenuLayer} from "react-vmenu";
// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import {BaseComponent, AddGlobalStyle} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import ScrollView from "react-vscrollview";
import getMuiTheme from "material-ui/styles/getMuiTheme";
// Themeing/Styling
import Theme from "../theme";

import "../Frame/Styles/Core.scss";
//import "../Frame/Styles/bootstrap/bootstrap.scss";

//import {BrowserRouter as Router, Route, browserHistory} from "react-router-dom";
import {Route} from "react-router";
import {ConnectedRouter as Router, routerReducer, routerMiddleware, push} from "react-router-redux";
//import createHistory from "history/lib/createBrowserHistory";
import {createBrowserHistory} from "react-router/node_modules/history";

import {Provider, connect} from "react-redux";
import Modal from "react-modal";
import GlobalUI from "../UI/Global";

import MoreUI from "../UI/More";
import AdminUI from "../UI/More/Admin";
import HomeUI from "../UI/Home";
import {GetUrlPath, E} from "../Frame/General/Globals_Free";
import {MessageBoxOptions, ACTMessageBoxShow, MessageBoxUI} from "../Frame/UI/VMessageBox";
import Button from "../Frame/ReactComponents/Button";
import Navbar from "../UI/@Shared/Navbar";
import StreamUI from "./Stream";
import ChatUI from "./Chat";
import UsersUI from "./Users";
import ForumUI from "./Forum";
import SocialUI from "./Social";
import TermsUI from "./Terms";
import PersonalUI from "./Personal";
import DebatesUI from "./Debates";
import SearchUI from "./Search";
import ProfileUI from "./Profile";

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
					<Route path="/stream" component={StreamUI}/>
					<Route path="/chat" component={ChatUI}/>

					<Route path="/users" component={UsersUI}/>
					<Route path="/forum" component={ForumUI}/>
					<Route path="/social" component={SocialUI}/>
					<Route path="/more" component={MoreUI}/>

					{/*<Route exact path="/" component={HomeUI}/>
					<Route exact path="/about" component={HomeUI}/>*/}
					{!GetUrlPath().StartsWithAny(...pages) && <HomeUI/>}

					<Route path="/terms" component={TermsUI}/>
					<Route path="/personal" component={PersonalUI}/>
					<Route path="/debates" component={DebatesUI}/>
					<Route path="/global" component={GlobalUI}/>

					<Route path="/search" component={SearchUI}/>
					<Route path="/profile" component={ProfileUI}/>
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