import {Button, CheckBox, Column, Text, DropDown, DropDownContent, DropDownTrigger, Pre, Row, RowLR, Select, Spinner, ColorPickerBox} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {GADDemo} from "UI/@GAD/GAD.js";
import {Button_GAD} from "UI/@GAD/GADButton.js";
import {store} from "Store";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Chroma, Chroma_Safe, Observer, RunInAction, RunInAction_Set} from "web-vcore";
import {ACTEnsureMapStateInit, NodeStyleRule, NodeStyleRule_IfType, NodeStyleRule_ThenType} from "Store/main/maps";
import {GetUser, Map} from "dm_common";
import React from "react";
import {GetEntries} from "js-vextensions";
import {UserPicker} from "UI/@Shared/Users/UserPicker";
import {userIDPlaceholder} from "../ActionBar_Left/PeopleDropDown";

const ratingPreviewOptions = [
	{name: "None", value: "none"},
	{name: "Bar (average)", value: "bar_average"},
	{name: "Chart", value: "chart"},
];

@Observer
export class LayoutDropDown extends BaseComponentPlus({} as {map: Map}, {}) {
	render() {
		const {map} = this.props;
		const {initialChildLimit} = store.main.maps;
		const {showReasonScoreValues} = store.main.maps;
		const uiState = store.main.maps;

		const Button_Final = GADDemo ? Button_GAD : Button;
		const splitAt = 210;
		return (
			<DropDown>
				<DropDownTrigger><Button_Final text="Layout" style={{height: "100%"}}/></DropDownTrigger>
				<DropDownContent style={{position: "fixed", right: 0, width: uiState.nodeStyleRules.length ? 700 : 350, borderRadius: "0 0 0 5px"}}><Column>
					<RowLR splitAt={splitAt}>
						<Pre>Initial child limit: </Pre>
						<Spinner min={1} style={{width: 100}} value={initialChildLimit} onChange={val=>{
							RunInAction_Set(this, ()=>store.main.maps.initialChildLimit = val);
						}}/>
					</RowLR>
					<RowLR splitAt={splitAt}>
						<Pre>Show Reason Score values: </Pre>
						<CheckBox value={showReasonScoreValues} onChange={val=>{
							RunInAction_Set(this, ()=>store.main.maps.showReasonScoreValues = val);
						}}/>
					</RowLR>
					<RowLR splitAt={splitAt}>
						<Pre>Toolbar rating previews: </Pre>
						<Select options={ratingPreviewOptions} value={store.main.maps.toolbarRatingPreviews} onChange={val=>{
							RunInAction_Set(this, ()=>store.main.maps.toolbarRatingPreviews = val);
						}}/>
					</RowLR>
					<Row mt={5}>
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
								thenType: NodeStyleRule_ThenType.setBackgroundColor,
								then_color1: "rgba(0,0,0,1)",
							})));
						}}/>
					</Row>
					{uiState.nodeStyleRules.map((rule, index)=>{
						return <StyleRuleUI key={index} rule={rule} index={index}/>;
					})}
				</Column></DropDownContent>
			</DropDown>
		);
	}
}

@Observer
class StyleRuleUI extends BaseComponent<{rule: NodeStyleRule, index: number}, {}> {
	render() {
		const {rule, index} = this.props;
		const if_user1 = GetUser(rule.if_user1);
		const uiState = store.main.maps;

		return (
			<Row key={index} center>
				<CheckBox value={rule.enabled} onChange={val=>RunInAction_Set(this, ()=>rule.enabled = val)}/>

				{/* if portion */}
				<Select options={GetEntries(NodeStyleRule_IfType)} value={rule.ifType} onChange={val=>{
					RunInAction_Set(this, ()=>{
						rule.ifType = val;
						// todo: when there are multiple types, add code here to reset the type-specific fields
					});
				}}/>
				{rule.ifType == NodeStyleRule_IfType.lastEditorIs &&
				<UserPicker value={rule.if_user1} onChange={val=>RunInAction_Set(this, ()=>rule.if_user1 = val)}>
					<Button text={rule.if_user1 != null ? `${if_user1?.displayName ?? "n/a"} (id: ${rule.if_user1})` : "(click to select user)"} style={{width: "100%"}}/>
				</UserPicker>}

				{/* then portion */}
				<Select options={GetEntries(NodeStyleRule_ThenType)} value={rule.thenType} onChange={val=>{
					RunInAction_Set(this, ()=>{
						rule.thenType = val;
						// todo: when there are multiple types, add code here to reset the type-specific fields
					});
				}}/>
				{rule.thenType == NodeStyleRule_ThenType.setBackgroundColor &&
				<ColorPickerBox popupStyle={{right: 0}} color={Chroma_Safe(rule.then_color1).rgba()} onChange={val=>RunInAction_Set(this, ()=>rule.then_color1 = Chroma(val).css())}/>}

				<Button ml={5} text="X" onClick={()=>{
					RunInAction_Set(this, ()=>uiState.nodeStyleRules.Remove(rule));
				}}/>
			</Row>
		);
	}
}