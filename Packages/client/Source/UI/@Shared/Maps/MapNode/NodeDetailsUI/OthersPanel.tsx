import {ArgumentType, HasAdminPermissions, MapNodeType, MeID, NodeRevisionDisplayDetails} from "dm_common";
import React from "react";
import {GetEntries, ModifyString, ToNumber} from "web-vcore/nm/js-vextensions.js";
import {Pre, Row, Select, Spinner} from "web-vcore/nm/react-vcomponents.js";
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
						<Pre>Font-size override: </Pre>
						<Spinner max={25} enabled={enabled} value={ToNumber(newRevisionData.displayDetails?.fontSizeOverride, 0)} onChange={val=>SetDisplayDetail("fontSizeOverride", val != 0 ? val : null)}/>
						<Pre> px (0 for auto)</Pre>
					</Row>}
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Width override: </Pre>
					<Spinner step={10} max={1000} enabled={enabled} value={ToNumber(newRevisionData.displayDetails?.widthOverride, 0)} onChange={val=>SetDisplayDetail("widthOverride", val != 0 ? val : null)}/>
					<Pre> px (0 for auto)</Pre>
				</Row>
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Children layout: </Pre>
					<Select options={[{name: "Structured", value: false}, {name: "Flat", value: true}]} enabled={enabled}
						value={newRevisionData.displayDetails?.childrenLayout_flat} onChange={val=>SetDisplayDetail("childrenLayout_flat", val)}/>
				</Row>
			</>
		);
	}
}