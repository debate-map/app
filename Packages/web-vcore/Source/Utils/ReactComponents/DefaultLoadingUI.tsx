import {BailHandler_loadingUI_default_Set, BailError} from "mobx-graphlink";
import React from "react";
import {Row, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, cssHelper} from "react-vextensions";
import {InfoButton} from "./InfoButton.js";

BailHandler_loadingUI_default_Set(info=>{
	return <DefaultLoadingUI comp={info.comp} bailMessage={info.bailMessage}/>;
});

export class DefaultLoadingUI extends BaseComponent<{
	comp: BaseComponent<any>, bailMessage: BailError, style?,
	extraUI_inRoot?: React.JSX.Element, extraUI_inRow?: React.JSX.Element,
}, {}> {
	render() {
		const {comp, bailMessage, style, extraUI_inRoot, extraUI_inRow} = this.props;
		const compProps_neededPropsOnly = Object.entries(comp.props).filter(a=>{
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

		const {css} = cssHelper(this);
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
						sel text={`Details (comp: ${comp["name"] ?? comp.constructor?.name}): ${bailMessage.message}`}/>
					{extraUI_inRow}
				</Row>
				{extraUI_inRoot}
			</div>
		);
	}
}

// ugly fix for useXXX call-count sometimes increasing, due to mobx-graphlink's bail-system being used (eg. first render bails, so 0 useXXX calls, followed by successful render, with X calls)
export const valueForPrevInputSlotsNotYetInitialized = Symbol("valueForPrevInputSlotsNotYetInitialized");

Object.defineProperty(Object.prototype, "prevInputs", {
	//configurable: true, // already defaults to true
	get() {
		// if this getter is being called, it means that the first render of a comp was interrupted by a mobx-graphlink "bail", and react-class-hooks is now running, assuming a prevInputs array was set for the current useXXX hook
		// so, pretend a "prevInputs" array exists (and of the same length as "inputs" is now), but with all values "undefined" (so react-class-hooks detects the array-values as changing)
		if (this.inputs instanceof Array) {
			//return this.inputs;
			return this.inputs.map(a=>valueForPrevInputSlotsNotYetInitialized);
		}
		return undefined;
	},
	set(value: any) {
		/*delete this["prevInputs"];
		this.prevInputs = value;*/
		// property on instance overrides propery on prototype
		Object.defineProperty(this, "prevInputs", {
			writable: true,
			value,
		});
	},
});