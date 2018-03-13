import {VMenuLayer} from "react-vmenu";
// We only need to import the modules necessary for initial render
import {PropTypes, Component} from "react";
import {BaseComponent, AddGlobalStyle, ShallowChanged} from "react-vextensions";
import "../Frame/UI/JQueryExtensions";
//import {Component as BaseComponent} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
//import "../Frame/Styles/Core.scss";
import "../../Source/Frame/Styles/Core.scss";
//import "../Frame/Styles/bootstrap/bootstrap.scss";
import {Provider, connect} from "react-redux";
import GlobalUI from "../UI/Global";
import MoreUI from "../UI/More";
import AdminUI from "../UI/More/Admin";
import HomeUI from "../UI/Home";
import {MessageBoxOptions, ACTMessageBoxShow, MessageBoxUI} from "react-vmessagebox";
import {Button} from "react-vcomponents";
import NavBar from "../UI/@Shared/NavBar";
import StreamUI from "./Stream";
import ChatUI from "./Chat";
import UsersUI from "./Users";
import ForumUI from "./Forum";
import SocialUI from "./Social";
import PersonalUI from "./Personal";
import DebatesUI from "./Debates";
import SearchUI from "./Search";
import ProfileUI from "./Profile";
import ReactGA from "react-ga";
import {persistStore} from "redux-persist";
import {createBlacklistFilter} from "redux-persist-transform-filter";
import {VURL, Vector2i} from "js-vextensions";
import { Connect } from "../Frame/Database/FirebaseConnect";
import {Switch} from "react-vcomponents";
import {RouterProvider} from 'redux-little-router';
import Route from "../Frame/ReactComponents/Route";
import AddressBarWrapper from "UI/@Shared/AddressBarWrapper";
import GuideUI from "UI/Guide";
import ReputationUI from "./Reputation";
import {Column} from "react-vcomponents";
import {DatabaseUI} from "./Database";
import {FeedbackUI} from "./Feedback";
import {NormalizeURL} from "../Frame/General/URLs";
import {GetUserBackground} from "../Store/firebase/users";
import {GetUserID} from "Store/firebase/users";

export class RootUIWrapper extends BaseComponent<{store}, {}> {
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

		//$(document).on("mousemove", "*", function(event, ui) {
		document.addEventListener("mousemove", event=> {
			if (event["handledGlobally"]) return;
			event["handledGlobally"] = true;

			g.mousePos = new Vector2i(event.pageX, event.pageY);
		});
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
		let background = GetUserBackground(GetUserID());
		return (
			<Column className="background"/*"unselectable"*/ style={{height: "100%"}}>
				{/*<div className="background" style={{
					position: "absolute", left: 0, right: 0, top: 0, bottom: 0, opacity: .5,
				}}/>*/}
				<style>{`
				.background {
					background-image: url(${background.url_1920}); /*, url(/Images/Backgrounds/Ocean_x1920.jpg);*/
					background-position: ${background.position || "center center"};
					background-size: cover;
				}
				@media (min-width: 1921px) {
					.background {
						background-image: url(${background.url_3840}); /*, url(/Images/Backgrounds/Ocean_x3840.jpg);*/
					}
				}
				`}</style>
				<AddressBarWrapper/>
				<OverlayUI/>
				<NavBar/>
				{/*<InfoButton_TooltipWrapper/>*/}
				<main style={{position: "relative", flex: 1, overflow: "hidden", display: "flex", flexDirection: "column"}}>
					<Route path="/stream"><StreamUI/></Route>
					<Route path="/chat"><ChatUI/></Route>
					<Route path="/reputation"><ReputationUI/></Route>

					<Route path="/database"><DatabaseUI/></Route>
					<Route path="/forum"><ForumUI/></Route>
					<Route path="/feedback"><FeedbackUI/></Route>
					<Route path="/more"><MoreUI/></Route>
					<Route withConditions={url=>NormalizeURL(VURL.FromState(url)).pathNodes[0] == "home"}><HomeUI/></Route>
					<Route path="/social"><SocialUI/></Route>
					<Route path="/personal"><PersonalUI/></Route>
					<Route path="/debates"><DebatesUI/></Route>
					<Route path="/global"><GlobalUI/></Route>

					<Route path="/search"><SearchUI/></Route>
					<Route path="/guide"><GuideUI/></Route>
					<Route path="/profile"><ProfileUI/></Route>
				</main>
			</Column>
		);
	}
}

class OverlayUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden"}}>
				<MessageBoxUI/>
				<VMenuLayer/>
			</div>
		);
	}
}