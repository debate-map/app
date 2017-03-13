// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import Navbar from "./containers/Navbar";
import "./styles/core.scss";
import {BaseComponent, AddGlobalStyle} from "./Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
//import ScrollView from "react-free-scrollbar";
var ScrollView = require("react-free-scrollbar").default;
import getMuiTheme from "material-ui/styles/getMuiTheme";
// Themeing/Styling
import Theme from "./theme";
import {BrowserRouter as Router, Route, browserHistory} from "react-router-dom";
import {Provider, connect} from "react-redux";
import Modal from "react-modal";
import GlobalUI from "./routes/Global";

import LoginRoute from "./routes/Login";
import SignupRoute from "./routes/Signup";
import ProjectsRoute from "./routes/Projects";
import AccountRoute from "./routes/Account";
import MoreUI from "./routes/More";
import AdminUI from "./routes/More/Admin";
import RootUI2 from "./routes/Root";
import {GetUrlPath, E} from "./Frame/General/Globals_Free";
import {MainState, RootState} from "./store/reducers";
import {MessageBoxOptions, ConfirmationBoxOptions, ACTShowMessageBox, ACTShowConfirmationBox} from "./Frame/UI/VMessageBox";
import Button from "./Frame/ReactComponents/Button";

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
			}}>
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

@(connect((state: RootState)=>({
	openMessageBoxOptions: state.main.openMessageBoxOptions,
	openConfirmationBoxOptions: state.main.openConfirmationBoxOptions,
})) as any)
class OverlayUI extends BaseComponent<{openMessageBoxOptions?: MessageBoxOptions, openConfirmationBoxOptions?: ConfirmationBoxOptions}, {}> {
	render() {
		let {openMessageBoxOptions, openConfirmationBoxOptions} = this.props;
		return (
			<div style={{position: "absolute"}}>
				{openMessageBoxOptions && <ModalUI type="message" options={openMessageBoxOptions}/>}
				{openConfirmationBoxOptions && <ModalUI type="confirmation" options={openConfirmationBoxOptions}/>}
			</div>
		);
	}
}


AddGlobalStyle(`
.ReactModal__Overlay { z-index: 1; }
`);

let styles = {
	overlay: {position: "fixed", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)"},
	content: {
		position: "absolute", overflow: "auto",
		//top: "40px", left: "40px", right: "40px", bottom: "40px",
		left: "50%", right: "initial", top: "50%", bottom: "initial", transform: "translate(-50%, -50%)",
		background: "rgba(0,0,0,.75)", border: "1px solid #555", WebkitOverflowScrolling: "touch", borderRadius: "4px", outline: "none", padding: "20px"
	}
};
class ModalUI extends BaseComponent<{type: "message" | "confirmation", options: MessageBoxOptions | ConfirmationBoxOptions}, {}> {
	render() {
		let {type, options} = this.props;
		return (
			<Modal isOpen={true} contentLabel={options.title || ""} style={E(styles, options.style)}
					onRequestClose={()=> {
						if (options.onCancel && options.onCancel() === false) return;
						if (type == "message")
							store.dispatch(new ACTShowMessageBox(null));
						else
							store.dispatch(new ACTShowConfirmationBox(null));
					}}>
				<div style={{fontSize: "18px", fontWeight: "bold"}}>{options.title}</div>
				<p style={{marginTop: 15}}>{options.message}</p>
				{type == "message" &&
					<Button text="OK"
						onClick={()=> {
							if (options.onOK && options.onOK() === false) return;
							store.dispatch(new ACTShowMessageBox(null));
						}}/>}
				{type == "confirmation" &&
					<div>
						<Button text="OK" onClick={()=> {
							if (options.onOK && options.onOK() === false) return;
							store.dispatch(new ACTShowConfirmationBox(null));
						}}/>
						<Button text="Cancel" ml={10} onClick={()=> {
							if (options.onCancel && options.onCancel() === false) return;
							store.dispatch(new ACTShowConfirmationBox(null));
						}}/>
					</div>}
			</Modal>
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