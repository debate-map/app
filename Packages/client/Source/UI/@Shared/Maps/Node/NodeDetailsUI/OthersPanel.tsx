import {ArgumentType, ChildLayout, ChildLayout_niceNames, ChildLayout_optionsStr, HasAdminPermissions, NodeType, MeID, NodeRevisionDisplayDetails, ChildOrdering, ChildOrdering_infoText} from "dm_common";
import React from "react";
import {TextPlus} from "web-vcore";
import {GetEntries, ModifyString, ToNumber} from "web-vcore/nm/js-vextensions.js";
import {Text, Pre, Row, Select, Spinner} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export class OthersPanel extends BaseComponent<NodeDetailsUI_SharedProps, {}> {
	render() {
		const {newData, newRevisionData, forNew, enabled, Change} = this.props;
		const SetDisplayDetail = (key: keyof NodeRevisionDisplayDetails, value: any)=>{
			if (value != null) {
				newRevisionData.displayDetails = {...newRevisionData.displayDetails, [key]: value};
			} else {
				delete newRevisionData.displayDetails?.[key];
				if (Object.keys(newRevisionData.displayDetails ?? {}).length == 0) {
					delete newRevisionData.displayDetails;
				}
			}
			Change();
		};

		return (
			<>
				{/*<Row style={{fontWeight: "bold"}}>Others:</Row>*/}
				{HasAdminPermissions(MeID()) &&
				<Row style={{display: "flex", alignItems: "center"}}>
					<Text>Font-size override:</Text>
					<Spinner ml={5} max={25} enabled={enabled} value={ToNumber(newRevisionData.displayDetails?.fontSizeOverride, 0)} onChange={val=>SetDisplayDetail("fontSizeOverride", val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Text>Width override:</Text>
					<Spinner ml={5} step={10} max={1000} enabled={enabled} value={ToNumber(newRevisionData.displayDetails?.widthOverride, 0)} onChange={val=>SetDisplayDetail("widthOverride", val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
				{// disabled for now, till layout-options for new approach are decided on
				/*<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<TextPlus info={`
						How to display children groups (re. truth, relevance, etc.). Note that this setting only applies in maps that allow special child-layouts.
						
						${ChildLayout_optionsStr}
					`.AsMultiline(0)}>Child layout:</TextPlus>
					<Select ml={5} enabled={enabled} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildLayout, a=>ChildLayout_niceNames[a])]}
						value={newRevisionData.displayDetails?.childLayout} onChange={val=>SetDisplayDetail("childLayout", val)}/>
				</Row>*/}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<TextPlus info={ChildOrdering_infoText}>Child ordering:</TextPlus>
					<Select ml={5} enabled={enabled} options={[{name: "Unchanged", value: null} as any, ...GetEntries(ChildOrdering, "ui")]}
						value={newRevisionData.displayDetails?.childOrdering} onChange={val=>SetDisplayDetail("childOrdering", val)}/>
				</Row>
			</>
		);
	}
}