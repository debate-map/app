import {Me} from "dm_common";
import keycode from "keycode";
import {hasHotReloaded} from "Main";
import React from "react";
import * as ReactColor from "react-color";
import {store} from "Store";
import {GetMGLUnsubscribeDelay, graph} from "Utils/LibIntegrations/MobXGraphlink";
import {AddressBarWrapper, ErrorBoundary, GetMirrorOfMobXTree, GetMirrorOfMobXTree_Options, LoadURL, Observer, PageContainer, RunInAction} from "web-vcore";
import chroma from "web-vcore/nm/chroma-js.js";
import {Clone, E, SleepAsync, SleepAsyncUntil, Vector2} from "web-vcore/nm/js-vextensions.js";
import {AsyncTrunk} from "web-vcore/nm/mobx-sync.js";
import {autorun, makeObservable, observable} from "web-vcore/nm/mobx.js";
import {deepObserve} from "mobx-utils";
import {DragDropContext as DragDropContext_Beautiful} from "web-vcore/nm/react-beautiful-dnd.js";
import ReactDOM from "web-vcore/nm/react-dom";
import {ColorPickerBox, Column, Div, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VMenuLayer} from "web-vcore/nm/react-vmenu.js";
import {MessageBoxLayer} from "web-vcore/nm/react-vmessagebox.js";
import "../../Source/Utils/Styles/Main.scss"; // keep absolute-ish, since scss file not copied to Source_JS folder
import {NavBar} from "../UI/@Shared/NavBar.js";
import {GlobalUI} from "../UI/Global.js";
import {HomeUI} from "../UI/Home.js";
import {MoreUI} from "../UI/More.js";
import {SLMode, ShowHeader} from "./@SL/SL.js";
import {HomeUI_SL} from "./@SL/Home_SL.js";
import {NavBar_SL} from "./@SL/NavBar_SL.js";
import {OnDragEnd} from "./@Root/RootDragHandler.js";
import {RootStyles} from "./@Root/RootStyles.js";
import {NodeDetailBoxesLayer} from "./@Shared/Maps/Node/DetailBoxes/NodeDetailBoxesLayer.js";
import {DatabaseUI} from "./Database.js";
import {UserProfileUI} from "./Database/Users/UserProfile.js";
import {DebatesUI} from "./Debates.js";
import {FeedbackUI} from "./Feedback.js";
import {ForumUI} from "./Forum.js";
import {SocialUI} from "./Social.js";

ColorPickerBox.Init(ReactColor, chroma);

// export class RootUIWrapper extends BaseComponentPlus({}, { storeReady: false }) {
@Observer
export class RootUIWrapper extends BaseComponent<{}, {}> {
	constructor(props) {
		super(props);
		makeObservable(this);
	}

	async ComponentWillMount() {
		const trunk = new AsyncTrunk(store, {storage: localStorage});
		if (startURL.GetQueryVar("clearState") == "true") {
			console.log("Clearing state. State before clear:", Clone(store));
			await trunk.clear();
		}

		// we start a mirror-generation here, but merely so that we can hook into its "onChange" event (to trigger another call to trunk.persist)
		//let changeCount = 0;
		const mirrorOpts = E(new GetMirrorOfMobXTree_Options(), {
			onChange: (sourceObj, mirrorObj)=>{
				if (!this.storeReady) return; // ignore "changes" that occur before store has finished loading (early "change" events are just from tree initialization)
				//changeCount++;
				//console.log(`Mirror changed (${changeCount})! Possibly persisting... (ie. if cooldown has passed) @SourceObj:`, sourceObj, "@MirrorObj:", mirrorObj, "@MirrorObj_Old:", mirrorObj_old);
				trunk.persist();
			},
		} as Partial<GetMirrorOfMobXTree_Options>);
		const root = GetMirrorOfMobXTree(store, mirrorOpts);
		/*autorun(()=>{
			const root = GetMirrorOfMobXTree_New(store, mirrorOpts);
			//const root = GetMirrorOfMobXTree_New2(store, mirrorOpts).get();
		});*/

		// monkey-patch async-trunk's persist function to add throttling (else can majorly slow down the app in certain cases, eg. when loading maps with tons of nodes expanded)
		trunk.persist = function() {
			return (async()=>{
				if (this.persistingScheduled) return;
				this.persistingScheduled = true;

				const lastPersistTime = this.lastPersistTime ?? 0;
				if (Date.now() - lastPersistTime < 500) {
					await SleepAsyncUntil(lastPersistTime + 500);
				}

				// now proceed with actual persisting
				this.lastPersistTime = Date.now();
				this.persistingScheduled = false;
				try {
					//console.log("Saving...");
					const storeJSON = JSON.stringify(this.store);
					await this.storage.setItem(this.storageKey, storeJSON);
				} catch (reason) {
					this.onError(reason);
				}
			})();
		};

		await trunk.init();
		console.log("Loaded state:", Clone(store));

		// some fields that need to be (re-)set after store is loaded (eg. due to their being initialized prior to the store, but some of their settings being controlled by in-store values)
		graph.options.unsubscribeTreeNodesAfter = GetMGLUnsubscribeDelay();

		// start auto-runs, now that store+firelink are created (and store has initialized -- not necessary, but nice)
		//require("../Utils/AutoRuns");

		if (!hasHotReloaded) {
			LoadURL(startURL);
		}
		if (PROD && store.main.analyticsEnabled) {
			console.log("Initialized Google Analytics.");
			//ReactGA.initialize("UA-21256330-33", {debug: true});
			//ReactGA.initialize("UA-21256330-33");

			/* let url = VURL.FromLocationObject(State().router).toString(false);
			ReactGA.set({page: url});
			ReactGA.pageview(url || "/"); */
		}

		RunInAction("RootUIWrapper.ComponentWillMount.notifyStoreReady", ()=>this.storeReady = true);
		//console.log("Marked ready!:", this.storeReady);
	}
	// use observable field for this rather than react state, since setState synchronously triggers rendering -- which breaks loading process above, when rendering fails
	@observable storeReady = false;

	render() {
		const {storeReady} = this;
		//console.log("StoreReady?:", storeReady);
		// if (!g.storeRehydrated) return <div/>;
		if (!storeReady) return null;

		return (
			<DragDropContext_Beautiful onDragEnd={OnDragEnd}>
				<RootUI/>
			</DragDropContext_Beautiful>
		);
	}

	ComponentDidMount() {
		/* if (DEV) {
			setTimeout(() => {
				G({ Perf: React.addons.Perf });
				React.addons.Perf.start();
			}, 100);
		} */

		// $(document).on('mousemove', '*', function(event, ui) {
		document.addEventListener("mousemove", event=>{
			if (event["handledGlobally"]) return;
			event["handledGlobally"] = true;

			g.mousePos = new Vector2(event.pageX, event.pageY);
		});

		document.addEventListener("keydown", event=>{
			if (event.which == keycode.codes.ctrl) g.ctrlDown = true;
			if (event.which == keycode.codes.shift) g.shiftDown = true;
			if (event.which == keycode.codes.alt) g.altDown = true;
		});
		document.addEventListener("keyup", event=>{
			if (event.which == keycode.codes.ctrl) g.ctrlDown = false;
			if (event.which == keycode.codes.shift) g.shiftDown = false;
			if (event.which == keycode.codes.alt) g.altDown = false;
		});

		// if in dev-mode, disable the body`s minHeight attribute
		if (DEV) {
			document.body.style.minHeight = null as any;
		}

		// add Quicksand font // commented; we embed the css directly in index.html now (we're hosting fonts ourselves now, so can't use google's standardized css url; and embedding directly may speed font-loading)
		/*const linkEl = <link href="//fonts.googleapis.com/css2?family=Quicksand:wght@500&display=swap" rel="stylesheet"/>;
		ReactDOM.render(ReactDOM.createPortal(linkEl, document.head), document.createElement("div")); // render directly into head*/

		if (SLMode) {
			/*const linkEl2 = <link href="//fonts.googleapis.com/css?family=Cinzel&display=swap" rel="stylesheet"/>;
			ReactDOM.render(ReactDOM.createPortal(linkEl2, document.head), document.createElement("div")); // render directly into head*/

			// css generated from: https://gwfh.mranftl.com/fonts/cinzel?subsets=latin,latin-ext
			const styleEl = <style>{`
				@font-face { /* cinzel-regular - latin_latin-ext */
					font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
					font-family: 'Cinzel'; font-style: normal; font-weight: 400;
					src: url('/Fonts/cinzel-v23-latin_latin-ext-regular.woff2') format('woff2'); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
				}
			`}</style>;
			ReactDOM.render(ReactDOM.createPortal(styleEl, document.head), document.createElement("div")); // render directly into head
		}
	}
}

declare global {
	var mousePos: Vector2;
	var ctrlDown: boolean;
	var shiftDown: boolean;
	var altDown: boolean;
}
g.mousePos = new Vector2(undefined, undefined);
G({ctrlDown: false, shiftDown: false, altDown: false});

@Observer
class RootUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		// const currentPage = State(a => a.main.page);
		const {page} = store.main;

		return (
			<Column className='background'/* 'unselectable' */ style={{height: "100%"}}>
				{/* <div className='background' style={{
					position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: .5,
				}}/> */}
				<RootStyles/>
				<ErrorBoundary>
					<AddressBarWrapper/>
					<OverlayUI/>
				</ErrorBoundary>
				{ShowHeader &&
				<ErrorBoundary>
					{!SLMode && <NavBar/>}
					{SLMode && <NavBar_SL/>}
				</ErrorBoundary>}
				{/* <InfoButton_TooltipWrapper/> */}
				<ErrorBoundary
					key={page} // use key, so that error-message clears when user changes pages
				>
					<main style={{position: "relative", flex: 1, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start"}}>
						{/*{page == "stream" && <StreamPanel/>}
						<Route path='/chat'><ChatUI/></Route>
						<Route path='/reputation'><ReputationUI/></Route>*/}

						{/* special, for login */}
						{page == "login-succeeded" && <PostLoginAttemptUI success={true}/>}
						{page == "login-failed" && <PostLoginAttemptUI success={false}/>}

						{page == "database" && <DatabaseUI/>}
						{page == "forum" && <ForumUI/>}
						{page == "feedback" && <FeedbackUI/>}
						{page == "more" && <MoreUI/>}
						{page == "home" && !SLMode && <HomeUI/>}
						{page == "home" && SLMode && <HomeUI_SL/>}
						{page == "social" && <SocialUI/>}
						{page == "debates" && <DebatesUI/>}
						{page == "global" && <GlobalUI/>}

						{/*<Route path='/search'><SearchUI/></Route>
						<Route path='/guide'><GuideUI/></Route>*/}
						{page == "profile" && <UserProfileUI user={Me()}/>}
					</main>
				</ErrorBoundary>
			</Column>
		);
	}
}

class OverlayUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div className="clickThrough" style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden"}}>
				<NodeDetailBoxesLayer/>
				<MessageBoxLayer/>
				<VMenuLayer/>
			</div>
		);
	}
}

function GetOpenerWindow(): Window | null {
	//if (window.opener != null && window.opener.constructor?.name == "Window") {
	if (window.opener != null) { // Firefox blocks access to window.opener.constructor, so don't check
		return window.opener;
	}
	return null;
}

//@Observer
class PostLoginAttemptUI extends BaseComponent<{success: boolean}, {}> {
	ComponentDidMount() {
		const {success} = this.props;
		if (!success) return; // if login failed, do nothing (since login state has not changed)

		//window.opener.open(url, '_self');
		const opener = GetOpenerWindow();
		if (opener) {
			opener.location.reload();
			opener.focus();
			window.close();
		}
	}

	render() {
		const {success} = this.props;
		const opener = GetOpenerWindow();
		return (
			<PageContainer>
				<Text>Login {success ? "succeeded" : "failed"}.</Text>
				{success && <Text>{opener ? "Reloading main window." : "However, main window was unable to be reloaded; you can close this popup, then reload it manually."}</Text>}
			</PageContainer>
		);
	}
}