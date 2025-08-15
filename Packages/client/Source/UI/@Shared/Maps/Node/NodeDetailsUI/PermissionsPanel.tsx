import {GetAccessPolicy} from "dm_common";
import React from "react";
import {PolicyPicker} from "UI/Database/Policies/PolicyPicker.js";
import {Button, Pre, RowLR} from "react-vcomponents";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";
import {observer_mgl} from "mobx-graphlink";

export type PermissionsPanel_Props = Pick<NodeDetailsUI_SharedProps, "enabled" | "newData" | "Change">;

export const PermissionsPanel = observer_mgl((props: PermissionsPanel_Props)=>{
	const {enabled, newData, Change} = props;
	const accessPolicy = GetAccessPolicy(newData.accessPolicy);

	const splitAt = 105;
	return (
		<>
			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Access policy: </Pre>
				<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val!)}>
					<Button enabled={enabled} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
				</PolicyPicker>
			</RowLR>
		</>
	);
});
