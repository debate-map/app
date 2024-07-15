import {GetAccessPolicy} from "dm_common";
import React from "react";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker.js";
import {Observer} from "web-vcore";
import {Button, Pre, RowLR} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

@Observer
export class PermissionsPanel extends BaseComponent<Pick<NodeDetailsUI_SharedProps, "enabled" | "newData" | "Change">, {}> {
	render() {
		const {enabled, newData, Change} = this.props;
		const accessPolicy = GetAccessPolicy(newData.accessPolicy);

		const splitAt = 105;
		return (
			<>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Access policy: </Pre>
					<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val)}>
						<Button enabled={enabled} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
					</PolicyPicker>
				</RowLR>
			</>
		);
	}
}