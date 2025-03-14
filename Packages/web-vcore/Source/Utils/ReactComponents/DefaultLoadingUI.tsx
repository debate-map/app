import {BailHandler_loadingUI_default_Set, BailError} from "mobx-graphlink";
import React from "react";
import {Row, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import {InfoButton} from "./InfoButton.js";
import {css2} from "../UI/Styles.js";

BailHandler_loadingUI_default_Set(info=>{
	return <DefaultLoadingUI comp={info!.comp} bailMessage={info!.bailMessage}/>;
});

export const DefaultLoadingUI = ((props: {
	comp: BaseComponent<any>|n, bailMessage: BailError|n, style?,
	extraUI_inRoot?: React.JSX.Element, extraUI_inRow?: React.JSX.Element,
})=>{
	const {comp, bailMessage, style, extraUI_inRoot, extraUI_inRow} = props;
	const compProps_neededPropsOnly = Object.entries(comp?.props ?? {}).filter(a=>{
		// allow attachment of hello-pangea-dnd's drag-handle props, otherwise a prominent warning is generated (in dev mode)
		if (a[0].startsWith("data-rbd-drag-handle-")) return true;
		return false;
	}).ToMapObj(a=>a[0], a=>a[1]);
	//console.log(`Comp:${comp.constructor.name} @CompProps:`, compProps_neededPropsOnly);

	/*if (globalThis.DEV) {
		const confirmedGoodLoadingUIComps = [
			"NodeBox",
		];
		if (!confirmedGoodLoadingUIComps.includes(comp.constructor.name)) {
			console.log("Got loading-ui for comp that's not yet confirmed to work well with it:", comp.constructor.name);
			//debugger;
		}
	}*/

	//const {css} = cssHelper(this);
	const css = css2;
	return (
		<div {...compProps_neededPropsOnly} style={css({
			display: "flex", alignItems: "center", justifyContent: "center", flex: 1, //fontSize: 25,
			//textShadow: "#000 0px 0px 1px,   #000 0px 0px 1px,   #000 0px 0px 1px, #000 0px 0px 1px,   #000 0px 0px 1px,   #000 0px 0px 1px",
			color: "white",
			textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
			zIndex: 11, // needed to show above sub-nav-bar
		}, style)}>
			<Row center>
				<Text>Loading...</Text>
				<InfoButton ml={5} mt={2} // dunno why mt:2 needed, but wouldn't center fully otherwise
					sel text={`Details (comp: ${comp?.["name"] ?? comp?.constructor?.name ?? "(no associated comp found)"}): ${bailMessage?.message ?? "(no associated bail error found)"}`}/>
				{extraUI_inRow}
			</Row>
			{extraUI_inRoot}
		</div>
	);
});