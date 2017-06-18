import {VMenuLayer} from "react-vmenu";
// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import {BaseComponent, AddGlobalStyle, ShallowChanged} from "../Frame/UI/ReactGlobals";
import "../Frame/UI/JQueryExtensions";
//import {Component as BaseComponent} from "react";
import ScrollView from "react-vscrollview";
//import "../Frame/Styles/Core.scss";
import "../../Source/Frame/Styles/Core.scss";
//import "../Frame/Styles/bootstrap/bootstrap.scss";
import {Provider, connect} from "react-redux";
import GlobalUI from "../UI/Global";
import MoreUI from "../UI/More";
import AdminUI from "../UI/More/Admin";
import HomeUI from "../UI/Home";
import {MessageBoxOptions, ACTMessageBoxShow, MessageBoxUI} from "../Frame/UI/VMessageBox";
import Button from "../Frame/ReactComponents/Button";
import NavBar from "../UI/@Shared/NavBar";
import StreamUI from "./Stream";
import ChatUI from "./Chat";
import UsersUI from "./Users";
import ForumUI from "./Forum";
import SocialUI from "./Social";
import ContentUI from "./Content";
import PersonalUI from "./Personal";
import DebatesUI from "./Debates";
import SearchUI from "./Search";
import ProfileUI from "./Profile";
import * as ReactGA from "react-ga";
import {persistStore} from "redux-persist";
import {createBlacklistFilter} from "redux-persist-transform-filter";
import {URL} from "../Frame/General/URLs";
import { Connect } from "../Frame/Database/FirebaseConnect";
import Switch from "Frame/ReactComponents/Switch";
import {RouterProvider} from 'redux-little-router';
import Route from "../Frame/ReactComponents/Route";
import AddressBarWrapper from "UI/@Shared/AddressBarWrapper";
import {InfoButton_TooltipWrapper} from "../Frame/ReactComponents/InfoButton";

export default class RootUIWrapper extends BaseComponent<{store}, {}> {
	ComponentWillMount() {
		let startVal = g.storeRehydrated;
		// wrap storeRehydrated property, so we know when it's set (from CreateStore.ts callback)
		(g as Object)._AddGetterSetter("storeRehydrated",
			()=>g.storeRehydrated_,
			val=> {
				g.storeRehydrated_ = val;
				setTimeout(()=>this.mounted && this.Update());//
			});
		// trigger setter right now (in case value is already true)
		g.storeRehydrated = startVal;
	}

	render() {
		let {store} = this.props;
		if (!g.storeRehydrated) return <div/>;

		return (
			<Provider store={store}>
				<RouterProvider store={store}>
					<RootUI/>
				</RouterProvider>
			</Provider>
		);
	}

	ComponentDidMount() {
		if (devEnv) {
			WaitXThenRun(100, ()=> {
				G({Perf: React.addons.Perf});
				React.addons.Perf.start();
			});
		}
	}
}

type Props = {} & Partial<{currentPage: string}>;
@Connect((state, props)=> ({
	currentPage: State(a=>a.main.page),
}))
class RootUI extends BaseComponent<Props, {}> {
	shouldComponentUpdate(newProps, newState) {
		// ignore change of "router" prop -- we don't use it
		return ShallowChanged(newProps.Excluding("router"), this.props.Excluding("router")) || ShallowChanged(newState, this.state);
	}
	render() {
		let {currentPage} = this.props;
		return (
			<div className="background"/*"unselectable"*/ style={{
				height: "100%", display: "flex", flexDirection: "column",
				//background: "rgba(0,0,0,1)",
			}}>
				{/*<div className="background" style={{
					position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: .5,
				}}/>*/}
				<AddressBarWrapper/>
				<OverlayUI/>
				<NavBar/>
				<InfoButton_TooltipWrapper/>
				<main style={{position: "relative", flex: "1 1 100%", overflow: "hidden"}}>
					<Route path="/stream"><StreamUI/></Route>
					<Route path="/chat"><ChatUI/></Route>

					<Route path="/users"><UsersUI/></Route>
					<Route path="/forum"><ForumUI/></Route>
					<Route path="/social"><SocialUI/></Route>
					<Route path="/more"><MoreUI/></Route>
					<Route withConditions={url=>URL.FromState(url).Normalized().pathNodes[0] == "home"}><HomeUI/></Route>
					<Route path="/content"><ContentUI/></Route>
					<Route path="/personal"><PersonalUI/></Route>
					<Route path="/debates"><DebatesUI/></Route>
					<Route path="/global"><GlobalUI/></Route>

					<Route path="/search"><SearchUI/></Route>
					<Route path="/profile"><ProfileUI/></Route>
				</main>
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