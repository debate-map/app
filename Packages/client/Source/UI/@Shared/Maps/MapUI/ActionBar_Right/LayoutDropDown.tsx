import {Button, CheckBox, Column, Text, DropDown, DropDownContent, DropDownTrigger, Pre, Row, RowLR, Select, Spinner, ColorPickerBox} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {Button_GAD} from "UI/@GAD/GADButton.js";
import {store} from "Store";
import {BuildErrorWrapperComp, Chroma, Chroma_Safe, defaultErrorUI, EB_StoreError, Observer, ReactError, RunInAction, RunInAction_Set, TextPlus} from "web-vcore";
import {ACTEnsureMapStateInit, NodeStyleRule, NodeStyleRuleComp_AccessPolicyDoesNotMatch, NodeStyleRuleComp_LastEditorIs, NodeStyleRuleComp_SetBackgroundColor, NodeStyleRule_IfType, NodeStyleRule_IfType_displayTexts, NodeStyleRule_ThenType, NodeStyleRule_ThenType_displayTexts} from "Store/main/maps";
import {GetUser, Map, ChildOrdering, ChildOrdering_infoText} from "dm_common";
import React, {Fragment} from "react";
import {GetEntries} from "js-vextensions";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker";

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

		const Button_Final = GADDemo ? Button_GAD : Button;
		const splitAt = 210;
		return (
			<DropDown>
				<DropDownTrigger><Button_Final text="Layout" style={{height: "100%"}}/></DropDownTrigger>
				<DropDownContent style={{position: "fixed", right: 0, width: uiState.nodeStyleRules.length ? 700 : 350, borderRadius: "0 0 0 5px"}}><Column>
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
						<TextPlus sel info={`
							When enabled, certain styling changes are made so that a "full-page screenshot" of the page/map can be taken, with reduced visual artifacts at the edges of each section/sub-screenshot.
							Recommended extension for actually taking the full-page screenshot: https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl
						`.AsMultiline(0)}>Screenshot mode:</TextPlus>
						<CheckBox value={uiState.screenshotMode} onChange={val=>RunInAction_Set(this, ()=>uiState.screenshotMode = val)}/>
						{uiState.screenshotMode &&
						<style>{`
							.scrollTrack {
								display: none !important;
							}
							nav, nav > div {
								box-shadow: none !important;
							}
						`}</style>}
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