import {Button, CheckBox, Column, Text, DropDown, DropDownContent, DropDownTrigger, Pre, Row, RowLR, Select, Spinner, ColorPickerBox} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {Button_GAD} from "UI/@GAD/GADButton.js";
import {store} from "Store";
import {BuildErrorWrapperComp, Chroma, Chroma_Safe, defaultErrorUI, EB_StoreError, Observer, ReactError, RunInAction, RunInAction_Set, TextPlus} from "web-vcore";
import {ACTEnsureMapStateInit, NodeStyleRule, NodeStyleRuleComp_AccessPolicyDoesNotMatch, NodeStyleRuleComp_LastEditorIs, NodeStyleRuleComp_SetBackgroundColor, NodeStyleRule_IfType, NodeStyleRule_IfType_displayTexts, NodeStyleRule_ThenType, NodeStyleRule_ThenType_displayTexts} from "Store/main/maps";
import {GetUser, Map, ChildOrdering, ChildOrdering_infoText} from "dm_common";
import React, {Fragment} from "react";
import {GetEntries, StartDownload} from "js-vextensions";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {ShowChangesSinceType} from "Store/main/maps/mapStates/@MapState";
import * as htmlToImage from "html-to-image";
import {MapUI} from "../../MapUI";

const changesSince_options = [] as {name: string, value: string}[];
changesSince_options.push({name: "None", value: `${ShowChangesSinceType.none}_null`});
for (let offset = 1; offset <= 5; offset++) {
	const offsetStr = [null, "", "2nd ", "3rd ", "4th ", "5th "][offset];
	changesSince_options.push({name: `Your ${offsetStr}last visit`, value: `${ShowChangesSinceType.sinceVisitX}_${offset}`});
}
changesSince_options.push({name: "All unclicked changes", value: `${ShowChangesSinceType.allUnseenChanges}_null`});

const ratingPreviewOptions = [
	{name: "None", value: "none"},
	{name: "Bar (average)", value: "bar_average"},
	{name: "Chart", value: "chart"},
];

@Observer
export class LayoutDropDown extends BaseComponentPlus({} as {map: Map}, {}) {
	render() {
		const {map} = this.props;
		const uiState = store.main.maps;
		const mapState = GetMapState.NN(map.id);
		const {showChangesSince_type} = mapState;
		const {showChangesSince_visitOffset} = mapState;
		const {childOrdering: weighting} = store.main.maps;

		const Button_Final = GADDemo ? Button_GAD : Button;
		const splitAt = 210;
		return (
			<DropDown>
				<DropDownTrigger><Button_Final text="Layout" style={{height: "100%"}}/></DropDownTrigger>
				<DropDownContent style={{position: "fixed", right: 0, width: uiState.nodeStyleRules.length ? 700 : 550, borderRadius: "0 0 0 5px"}}><Column>
					<RowLR splitAt={splitAt}>
						<Pre>Initial child limit:</Pre>
						<Spinner min={1} style={{width: 100}} value={uiState.initialChildLimit} onChange={val=>{
							RunInAction_Set(this, ()=>uiState.initialChildLimit = val);
						}}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<TextPlus info={ChildOrdering_infoText}>Child ordering:</TextPlus>
						<Select options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildOrdering, "ui")]}
							value={uiState.childOrdering} onChange={val=>RunInAction_Set(this, ()=>uiState.childOrdering = val)}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<Pre>Show Reason Score values:</Pre>
						<CheckBox value={uiState.showReasonScoreValues} onChange={val=>RunInAction_Set(this, ()=>uiState.showReasonScoreValues = val)}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<Pre>Show changes since: </Pre>
						<Select options={changesSince_options} value={`${showChangesSince_type}_${showChangesSince_visitOffset}`} onChange={val=>{
							RunInAction("ActionBar_Right.ShowChangesSince.onChange", ()=>{
								const parts = val.split("_");
								mapState.showChangesSince_type = parts[0];
								mapState.showChangesSince_visitOffset = JSON.parse(parts[1]);
							});
						}}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<TextPlus info="If enabled, then when you create a new node, it will start out as expanded.">Auto-expand new nodes:</TextPlus>
						<CheckBox value={uiState.autoExpandNewNodes} onChange={val=>RunInAction_Set(this, ()=>uiState.autoExpandNewNodes = val)}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<TextPlus info={`
							When enabled, a small button is shown to the left of nodes that were the source or result of node-cloning operations.
							Clicking that button shows the full cloning history, and lets you jump to each of the nodes in those chains.
						`.AsMultiline(0)}>Show clone-history buttons:</TextPlus>
						<CheckBox value={uiState.showCloneHistoryButtons} onChange={val=>RunInAction_Set(this, ()=>uiState.showCloneHistoryButtons = val)}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<Pre>Toolbar rating previews:</Pre>
						<Select options={ratingPreviewOptions}
							value={uiState.toolbarRatingPreviews} onChange={val=>RunInAction_Set(this, ()=>uiState.toolbarRatingPreviews = val)}/>
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<Pre>Forced-expand:</Pre>
						<CheckBox value={uiState.forcedExpand} onChange={val=>RunInAction_Set(this, ()=>uiState.forcedExpand = val)}/>
						{uiState.forcedExpand &&
						<>
							<Spinner ml={5} min={0} instant={true} style={{width: 50}} value={uiState.forcedExpand_depth} onChange={val=>{
								RunInAction_Set(this, ()=>uiState.forcedExpand_depth = val);
							}}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+1" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 1)}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+.5" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 0.5)}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+.2" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 0.2)}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+.1" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 0.1)}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+.05" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 0.05)}/>
							<Button ml={3} p={5} style={{fontSize: 12}} text="+.01" onClick={()=>RunInAction_Set(this, ()=>uiState.forcedExpand_depth += 0.01)}/>
						</>}
					</RowLR>
					<RowLR mt={3} splitAt={splitAt}>
						<Text>Screenshots:</Text>

						<TextPlus sel info={`
							When enabled, certain styling changes are made so that a "full-page screenshot" of the page/map can be taken, with a cleaner appearance. Specifically:
							1) Nav-bar shadows are removed, to reduce visual artifacts at the edges of map. (scroll-bars are also hidden, for if using screenshot extension)
							2) Argument control-bars are hidden. (not relevant to non-interactive viewing)
							3) Clone-history buttons are hidden. (not relevant to non-interactive viewing)
							4) Child limit-bars are hidden. (not relevant to non-interactive viewing)
							5) Reduces map-padding to 100px. (for faster full-page screenshots from extension; switch page away and back to apply)
							Recommended extension for actually taking the full-page screenshot: https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl
						`.AsMultiline(0)}>Prep:</TextPlus>
						<CheckBox ml={5} value={uiState.screenshotMode} onChange={val=>RunInAction_Set(this, ()=>uiState.screenshotMode = val)}/>
						{uiState.screenshotMode &&
						<style>{`
							.scrollTrack {
								display: none !important;
							}
							nav, nav > div {
								box-shadow: none !important;
							}
						`}</style>}

						<Button ml={5} text="Take screenshot" onClick={async()=>{
							const mapUIEl = MapUI.CurrentMapUI?.DOM_HTML;
							const mapUIRootEl = mapUIEl?.querySelector(".MapUI") as HTMLElement;
							if (mapUIRootEl == null) return void alert("Could not find the root \".MapUI\" element.");

							// if width/height other than 100% (ie. if map is zoomed), temporarily override width/height to 100% (else screenshotter gets confused / is sized wrong)
							Object.assign(mapUIRootEl.style, {minWidth: "100%", maxWidth: "100%", minHeight: "100%", maxHeight: "100%"});
							//const oldWidth = mapUIRootEl.style.width, oldHeight = mapUIRootEl.style.height;
							//Object.assign(mapUIRootEl.style, {width: "100%", height: "100%"});

							const dataUrl = await htmlToImage.toPng(mapUIRootEl);

							// reset map-root-el's width/height to normal
							Object.assign(mapUIRootEl.style, {minWidth: null, maxWidth: null, minHeight: null, maxHeight: null});
							//Object.assign(mapUIRootEl.style, {width: oldWidth, maxWidth: oldHeight});

							StartDownload(dataUrl, "MapScreenshot.png", "", false);
						}}/>
					</RowLR>
					<Row mt={3}>
						<Button text="Clear map-view state" onClick={()=>{
							RunInAction_Set(this, ()=>{
								uiState.mapViews.delete(map.id);
								ACTEnsureMapStateInit(map.id);
							});
						}}/>
					</Row>

					<Row mt={10}>
						<Text style={{fontSize: 16}}>Style rules</Text>
						<Button ml={5} text="+" onClick={()=>{
							RunInAction_Set(this, ()=>uiState.nodeStyleRules.push(new NodeStyleRule({
								ifType: NodeStyleRule_IfType.lastEditorIs,
								if_lastEditorIs: new NodeStyleRuleComp_LastEditorIs(),
								thenType: NodeStyleRule_ThenType.setBackgroundColor,
								then_setBackgroundColor: new NodeStyleRuleComp_SetBackgroundColor().VSet({color: "rgba(0,0,0,1)"}),
							})));
						}}/>
					</Row>
					{uiState.nodeStyleRules.map((rule, index)=>{
						return <StyleRuleUI_ErrorWrapper key={index} rule={rule} index={index}/>;
					})}
				</Column></DropDownContent>
			</DropDown>
		);
	}
}

const StyleRuleUI_ErrorWrapper = BuildErrorWrapperComp<StyleRuleUI_Props>(()=>StyleRuleUI, (info, comp)=>{
	const uiState = store.main.maps;
	return <Column>
		<Button text="Remove this invalid entry" onClick={()=>RunInAction("StyleRuleUI_ErrorWrapper", ()=>uiState.nodeStyleRules.Remove(comp.props.rule))}/>
		{info.defaultUI(info, comp)}
	</Column>;
});

type StyleRuleUI_Props = {rule: NodeStyleRule, index: number};
@Observer
class StyleRuleUI extends BaseComponent<StyleRuleUI_Props, {}> {
	render() {
		const {rule, index} = this.props;
		const if_lastEditorIs_user = GetUser(rule.if_lastEditorIs?.user);
		const uiState = store.main.maps;
		const ChangeIfBlock = (setter: ()=>any)=>{
			RunInAction("StyleRuleUI.ChangeIfBlock", ()=>{
				setter();
				// re-set if-fields, so mobx detects change
				for (const key of Object.keys(rule)) {
					if (key.startsWith("if_")) rule[key] = {...rule[key]};
				}
			});
		};
		const ChangeThenBlock = (setter: ()=>any)=>{
			RunInAction("StyleRuleUI.ChangeThenBlock", ()=>{
				setter();
				// re-set then-fields, so mobx detects change
				for (const key of Object.keys(rule)) {
					if (key.startsWith("then_")) rule[key] = {...rule[key]};
				}
			});
		};

		return (
			<Fragment key={index}>
				<Row mt={5} style={{alignSelf: "flex-start", background: "rgba(0,0,0,.1)", borderRadius: "10px 10px 0 0", border: "solid black", borderWidth: "1px 1px 0 1px"}}>
					<CheckBox ml={5} text="Enabled" value={rule.enabled} onChange={val=>RunInAction_Set(this, ()=>rule.enabled = val)}/>
					<Button ml={5} text="X" style={{padding: "0 5px"}} onClick={()=>{
						RunInAction_Set(this, ()=>uiState.nodeStyleRules.Remove(rule));
					}}/>
				</Row>
				<Column style={{alignItems: "flex-start", border: "1px solid black", borderRadius: "0 5px 5px 5px", padding: 5}}>
					<Row center>
						<Text ml={5} mr={5}>If...</Text>

						<Select options={GetEntries(NodeStyleRule_IfType, name=>NodeStyleRule_IfType_displayTexts[name])} value={rule.ifType} onChange={val=>{
							RunInAction_Set(this, ()=>{
								rule.ifType = val;
								if (rule.ifType == NodeStyleRule_IfType.lastEditorIs) {
									rule.if_lastEditorIs ??= new NodeStyleRuleComp_LastEditorIs();
								} else if (rule.ifType == NodeStyleRule_IfType.accessPolicyDoesNotMatch) {
									rule.if_accessPolicyDoesNotMatch ??= new NodeStyleRuleComp_AccessPolicyDoesNotMatch();
								}
							});
						}}/>
						{rule.ifType == NodeStyleRule_IfType.lastEditorIs &&
						<UserPicker value={rule.if_lastEditorIs.user} onChange={val=>ChangeIfBlock(()=>rule.if_lastEditorIs.user = val)}>
							{text=><Button ml={5} text={text} style={{width: "100%"}}/>}
						</UserPicker>}
						{rule.ifType == NodeStyleRule_IfType.accessPolicyDoesNotMatch &&
							<Text ml={5}>any policy in the following list...</Text>}
					</Row>
					{rule.ifType == NodeStyleRule_IfType.accessPolicyDoesNotMatch &&
					<Column ml={30}>
						{rule.if_accessPolicyDoesNotMatch.policyIDs.map((policyID, index)=>{
							return <Row mt={5} key={index}>
								<PolicyPicker value={policyID} onChange={val=>ChangeIfBlock(()=>rule.if_accessPolicyDoesNotMatch.policyIDs[index] = val)}>
									{text=><Button text={text} style={{width: "100%"}}/>}
								</PolicyPicker>
								<Button ml={5} text="X" onClick={()=>rule.if_accessPolicyDoesNotMatch.policyIDs.RemoveAt(index)}/>
							</Row>;
						})}
						<Button mt={5} text="Add policy to list" onClick={()=>rule.if_accessPolicyDoesNotMatch.policyIDs.push(null)}/>
					</Column>}

					<Row center>
						<Text ml={5} mr={5}>Then...</Text>
						<Select options={GetEntries(NodeStyleRule_ThenType, name=>NodeStyleRule_ThenType_displayTexts[name])} value={rule.thenType} onChange={val=>{
							RunInAction_Set(this, ()=>{
								rule.thenType = val;
								if (rule.thenType == NodeStyleRule_ThenType.setBackgroundColor) {
									rule.then_setBackgroundColor ??= new NodeStyleRuleComp_SetBackgroundColor();
								}
							});
						}}/>
						{rule.thenType == NodeStyleRule_ThenType.setBackgroundColor &&
						<ColorPickerBox ml={5} popupStyle={{right: 0}} color={Chroma_Safe(rule.then_setBackgroundColor.color).rgba()} onChange={val=>ChangeThenBlock(()=>rule.then_setBackgroundColor.color = Chroma(val).css())}/>}
					</Row>
				</Column>
			</Fragment>
		);
	}
}