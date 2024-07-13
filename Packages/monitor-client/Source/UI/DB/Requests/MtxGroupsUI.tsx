import React from "react";
import {store} from "Store";
import {MtxGroup, MtxConstraint, MtxSectionConstraint} from "Store/main/database/MtxGroup";
import {Chroma, Chroma_Safe, InfoButton, Observer, RunInAction} from "web-vcore";
import {Clone} from "js-vextensions";
import {Button, CheckBox, ColorPickerBox, Column, Row, Select, Text, TextInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

@Observer
export class MtxGroupsUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const uiState = store.main.db.requests;
		const groups = uiState.groups;

		// the code in the descendent comps just modify the data directly;
		// 	we then notify the mobx listeners by sending a clone of the groups-array to the store-field, using the mobx-aware approach
		const Change = (..._)=>{
			RunInAction("GroupUI_Change", ()=>{
				const groupsClone = Clone(groups);
				uiState.groups = groupsClone;
			});
		};

		return (
			<Column>
				<Row mb={5}>
					<Text>Groups:</Text>
					<Button ml={5} p="3px 7px" text="+" onClick={()=>{
						Change(groups.push(new MtxGroup()));
					}}/>
					<Text ml={5}>Note: Non-regex match-strings are matched with case-insensitivity.</Text>
				</Row>
				<Column>
					{groups.map((group, index)=>{
						return <GroupUI key={index} group={group} index={index} groups={groups} Change={Change}/>;
					})}
				</Column>
			</Column>
		);
	}
}

class GroupUI extends BaseComponent<{group: MtxGroup, index: number, groups: MtxGroup[], Change: Function}, {}> {
	render() {
		const {group, index, groups, Change} = this.props;
		return (
			<Column ml={10} mt={index == 0 ? 0 : 10} p={5} style={{background: "rgba(0,0,0,.1)", borderRadius: 10}}>
				<Row center>
					<CheckBox text="Enabled" value={group.enabled} onChange={val=>Change(group.enabled = val)}/>
					<Button ml={5} text="Delete" onClick={()=>Change(groups.Remove(group))}/>
					<Button ml={5} text="↑" onClick={()=>Change(groups.Move(group, index - 1))}/>
					<Button ml={5} text="↓" onClick={()=>Change(groups.Move(group, index + 1))}/>
					<Text ml={10}>Effects:</Text>
					<CheckBox ml={5} text="Filter" value={group.filter} onChange={val=>Change(group.filter = val)}/>
					<CheckBox ml={5} text="Highlight:" value={group.highlight} onChange={val=>Change(group.highlight = val)}/>
					<ColorPickerBox color={Chroma_Safe(group.highlightColor).rgba()} onChange={val=>Change(group.highlightColor = Chroma(val).css())}/>
				</Row>
				<Row center>
					<Text>Constraints:</Text>
					<Button ml={5} p="3px 7px" text="+" onClick={()=>{
						Change(group.constraints.push(new MtxConstraint()));
					}}/>
				</Row>
				{group.constraints.map((constraint, index)=>{
					return <MtxConstraintUI key={index} constraint={constraint} index={index} constraints={group.constraints} Change={Change}/>;
				})}
			</Column>
		);
	}
}
class MtxConstraintUI extends BaseComponent<{constraint: MtxConstraint, index: number, constraints: MtxConstraint[], Change: Function}, {}> {
	render() {
		const {constraint, index, constraints, Change} = this.props;
		return (
			<Column ml={10} mt={index == 0 ? 0 : 10} p={5} style={{background: "rgba(0,0,0,.1)", borderRadius: 10}}>
				<Row>
					<CheckBox text="Enabled" value={constraint.enabled} onChange={val=>Change(constraint.enabled = val)}/>
					<Button ml={5} text="Delete" onClick={()=>Change(constraints.Remove(constraint))}/>
					<Text ml={10}>Type:</Text>
					<Select ml={5} options={sectionConstraintTypes_names} value={sectionConstraintTypes_names[0]}/>
				</Row>
				<MtxSectionConstraintUI constraint={constraint.hasSectionMatching} index={0} Change={Change}/>
			</Column>
		);
	}
}
const sectionConstraintTypes_names = ["Has a section where..."];
class MtxSectionConstraintUI extends BaseComponent<{constraint: MtxSectionConstraint, index: number, Change: Function}, {}> {
	render() {
		const {constraint, index, Change} = this.props;
		return (
			<Column ml={10}>
				{/*<CheckBox value={constraint.enabled} onChange={val=>Change(constraint.enabled = val)}/>*/}
				<Row center>
					<CheckBox ml={5} text="Path:" value={constraint.path_matchEnabled} onChange={val=>Change(constraint.path_matchEnabled = val)}/>
					<TextInput ml={5} style={{flex: 1}} value={constraint.path_matchStr} onChange={val=>Change(constraint.path_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>
				</Row>
				<Row center>
					<CheckBox ml={5} text="Extra-info:" value={constraint.extraInfo_matchEnabled} onChange={val=>Change(constraint.extraInfo_matchEnabled = val)}/>
					<TextInput ml={5} style={{flex: 1}} value={constraint.extraInfo_matchStr} onChange={val=>Change(constraint.extraInfo_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>
				</Row>
			</Column>
		);
	}
}