import {Me} from "dm_common";
import {hasHotReloaded} from "Main";
import React, {useEffect, useMemo, useRef} from "react";
import * as ReactColor from "react-color";
import {store} from "Store";
import {GetMGLUnsubscribeDelay, graph} from "Utils/LibIntegrations/MobXGraphlink";
import {AddressBarWrapper, ErrorBoundary, GetMirrorOfMobXTree, GetMirrorOfMobXTree_Options, LoadURL, PageContainer, RunInAction} from "web-vcore";
import chroma from "chroma-js";
import {Clone, E, SleepAsyncUntil, Vector2} from "js-vextensions";
import {AsyncTrunk} from "mobx-sync";
import {makeObservable, observable} from "mobx";
import {DragDropContext as DragDropContext_Beautiful} from "@hello-pangea/dnd";
import {ColorPickerBox, Column, Text} from "react-vcomponents";
import {VMenuLayer} from "react-vmenu";
import {MessageBoxLayer} from "react-vmessagebox";
import "../../Source/Utils/Styles/Main.scss"; // keep absolute-ish, since scss file not copied to Source_JS folder
import {ApolloProvider} from "@apollo/client";
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
import {apolloClient} from "../Utils/LibIntegrations/Apollo.js";
import {LinkPreserver} from "./@Root/LinkPreserver.js";
import {observer_mgl} from "mobx-graphlink";

ColorPickerBox.Init(ReactColor, chroma);

export const RootUIWrapper = observer_mgl(()=>{
	const isMounted = useRef(false);
	const self = useMemo(()=>{
		return makeObservable({
			storeReady: false,
		}, {storeReady: observable});
	}, []);

	if (!isMounted.current){
		(async()=>{
			const trunk = new AsyncTrunk(store, {storage: localStorage});
			if (startURL.GetQueryVar("clearState") == "true") {
				console.log("Clearing state. State before clear:", Clone(store));
				await trunk.clear();
			}

			// we start a mirror-generation here, but merely so that we can hook into its "onChange" event (to trigger another call to trunk.persist)
			const mirrorOpts = E(new GetMirrorOfMobXTree_Options(), {
				onChange: (sourceObj, mirrorObj)=>{
					if (!self.storeReady) return; // ignore "changes" that occur before store has finished loading (early "change" events are just from tree initialization)
					//changeCount++;
					//console.log(`Mirror changed (${changeCount})! Possibly persisting... (ie. if cooldown has passed) @SourceObj:`, sourceObj, "@MirrorObj:", mirrorObj, "@MirrorObj_Old:", mirrorObj_old);
					trunk.persist();
				},
			} as Partial<GetMirrorOfMobXTree_Options>);
			const root = GetMirrorOfMobXTree(store, mirrorOpts);

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

			if (!hasHotReloaded) {
				LoadURL(startURL);
			}

			if (PROD && store.main.analyticsEnabled) {
				console.log("Initialized Google Analytics.");
			}

			RunInAction("RootUIWrapper.ComponentWillMount.notifyStoreReady", ()=>self.storeReady = true);
			console.log("Marked ready!:", self.storeReady);
		})();

	}

	useEffect(()=>{
		console.log("RootUIWrapper mounted.");
		isMounted.current = true;
		document.addEventListener("mousemove", event=>{
			if (event["handledGlobally"]) return;
			event["handledGlobally"] = true;
			g.mousePos = new Vector2(event.pageX, event.pageY);
		});

		document.addEventListener("keydown", event=>{
			if (event.key === "Control") g.ctrlDown = true;
			if (event.key === "Shift") g.shiftDown = true;
			if (event.key === "Alt") g.altDown = true;
		});
		document.addEventListener("keyup", event=>{
			if (event.key === "Control") g.ctrlDown = false;
			if (event.key === "Shift") g.shiftDown = false;
			if (event.key === "Alt") g.altDown = false;
		});

		// if in dev-mode, disable the body`s minHeight attribute
		if (DEV) {
			document.body.style.minHeight = null as any;
		}

		if (SLMode) {
			// css generated from: https://gwfh.mranftl.com/fonts/cinzel?subsets=latin,latin-ext
			const styleEl = document.createElement("style");
			styleEl.textContent = `
				@font-face { /* cinzel-regular - latin_latin-ext */
					font-display: swap; /* Check https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display for other options. */
					font-family: 'Cinzel'; font-style: normal; font-weight: 400;
					src: url('/Fonts/cinzel-v23-latin_latin-ext-regular.woff2') format('woff2'); /* Chrome 36+, Opera 23+, Firefox 39+, Safari 12+, iOS 10+ */
				}
			`;
			document.head.appendChild(styleEl);
		}

		return ()=>{
			isMounted.current = false;
		}
	}, []);

	const {storeReady} = self;
	if (!storeReady) return null;

	return (
		<DragDropContext_Beautiful onDragEnd={OnDragEnd}>
			<ApolloProvider client={apolloClient}>
				<RootUI/>
			</ApolloProvider>
		</DragDropContext_Beautiful>
	);

})

declare global {
	var mousePos: Vector2;
	var ctrlDown: boolean;
	var shiftDown: boolean;
	var altDown: boolean;
}

g.mousePos = new Vector2(undefined, undefined);
G({ctrlDown: false, shiftDown: false, altDown: false});

export const RootUI = observer_mgl(()=>{
	const {page} = store.main;

	return (
		<Column className='background' style={{height: "100%"}}>
			<RootStyles/>
			<ErrorBoundary>
				<AddressBarWrapper/>
				<LinkPreserver/>
				<OverlayUI/>
			</ErrorBoundary>
			{ShowHeader &&
			<ErrorBoundary>
				{!SLMode && <NavBar/>}
				{SLMode && <NavBar_SL/>}
			</ErrorBoundary>}
			<ErrorBoundary
				key={page} // use key, so that error-message clears when user changes pages
			>
				<main style={{position: "relative", flex: 1, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "flex-start"}}>
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
					{page == "profile" && <UserProfileUI user={Me()}/>}
				</main>
			</ErrorBoundary>
		</Column>
	);
});

const OverlayUI = ()=>{
	return (
		<div className="clickThrough" style={{position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden"}}>
			<NodeDetailBoxesLayer/>
			<MessageBoxLayer/>
			<VMenuLayer/>
		</div>
	);
};

const GetOpenerWindow = (): Window | null=>{
	// Firefox blocks access to window.opener.constructor, so don't check
	if (window.opener != null) {
		return window.opener;
	}
	return null;
};

const PostLoginAttemptUI = ({success}: {success: boolean})=>{
	useEffect(()=>{
		// if login failed, do nothing (since login state has not changed)
		if (!success) return;

		const opener = GetOpenerWindow();
		if (opener) {
			opener.location.reload();
			opener.focus();
			window.close();
		}
	}, [success]);

	const opener = GetOpenerWindow();
	return (
		<PageContainer>
			<Text>Login {success ? "succeeded" : "failed"}.</Text>
			{success && (
				<Text>{opener ? "Reloading main window." : "However, main window was unable to be reloaded; you can close this popup, then reload it manually."}</Text>
			)}
		</PageContainer>
	);
};
