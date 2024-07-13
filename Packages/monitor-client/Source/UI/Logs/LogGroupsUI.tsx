import React from "react";
import {store} from "Store";
import {LogConstraint, LogGroup} from "Store/main/logs/LogGroup";
import {Level_values} from "UI/Logs/Realtime.js";
import {Chroma, Chroma_Safe, InfoButton, Observer, RunInAction} from "web-vcore";
import {Clone} from "js-vextensions";
import {Button, CheckBox, ColorPickerBox, Column, Row, Select, Text, TextInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

@Observer
export class LogGroupsUI extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;
		const uiState = store.main.logs;
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
						Change(groups.push(new LogGroup()));
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

class GroupUI extends BaseComponent<{group: LogGroup, index: number, groups: LogGroup[], Change: Function}, {}> {
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
						Change(group.constraints.push(new LogConstraint()));
					}}/>
				</Row>
				{group.constraints.map((constraint, index)=>{
					return <LogConstraintUI key={index} constraint={constraint} index={index} constraints={group.constraints} Change={Change}/>;
				})}
			</Column>
		);
	}
}
class LogConstraintUI extends BaseComponent<{constraint: LogConstraint, index: number, constraints: LogConstraint[], Change: Function}, {}> {
	render() {
		const {constraint, index, constraints, Change} = this.props;
		return (
			<Column ml={10} mt={index == 0 ? 0 : 10} p={5} style={{background: "rgba(0,0,0,.1)", borderRadius: 10}}>
				<Row>
					<CheckBox text="Enabled" value={constraint.enabled} onChange={val=>Change(constraint.enabled = val)}/>
					<Button ml={5} text="Delete" onClick={()=>Change(constraints.Remove(constraint))}/>
				</Row>
				<Row center>
					<CheckBox ml={5} text="Level:" value={constraint.level_matchEnabled} onChange={val=>Change(constraint.level_matchEnabled = val)}/>
					{/*<TextInput ml={5} style={{flex: 1}} value={constraint.level_matchStr} onChange={val=>Change(constraint.level_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>*/}
					{Level_values
						.filter(a=>a != "TRACE") // atm at least, trace logs are not sent to monitor-backend (would be too much traffic), so it's not relevant to the user currently
						.map(levelVal=>{
							return <CheckBox key={levelVal} ml={5} text={levelVal} value={constraint.level_matchVals.includes(levelVal)} onChange={val=>{
								Change(constraint.level_matchVals = Level_values.filter(a=>(a == levelVal ? val : constraint.level_matchVals.includes(a))));
							}}/>;
						})}
				</Row>
				<Row center>
					<CheckBox ml={5} text="Target:" value={constraint.target_matchEnabled} onChange={val=>Change(constraint.target_matchEnabled = val)}/>
					<TextInput ml={5} style={{flex: 1}} value={constraint.target_matchStr} onChange={val=>Change(constraint.target_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>
				</Row>
				<Row center>
					<CheckBox ml={5} text="SpanName:" value={constraint.spanName_matchEnabled} onChange={val=>Change(constraint.spanName_matchEnabled = val)}/>
					<TextInput ml={5} style={{flex: 1}} value={constraint.spanName_matchStr} onChange={val=>Change(constraint.spanName_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>
				</Row>
				<Row center>
					<CheckBox ml={5} text="Message:" value={constraint.message_matchEnabled} onChange={val=>Change(constraint.message_matchEnabled = val)}/>
					<TextInput ml={5} style={{flex: 1}} value={constraint.message_matchStr} onChange={val=>Change(constraint.message_matchStr = val)}/>
					<InfoButton ml={5} text={`
						You can supply a regular-expression here by starting and ending the string with a forward-slash. (eg: /(my)?(regex)?/)
					`.AsMultiline(0)}/>
				</Row>
			</Column>
		);
	}
}