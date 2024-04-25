import {store} from "Store";
import React from "react";
import {CheckBox, Column, Row, RowLR, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Observer} from "web-vcore";
import {GetAccessPolicy} from "dm_common";
import {MI_SharedProps} from "../../NodeUI_Menu.js";
import {useSubtreeRetrievalQueryOrAccessors} from "../MI_SubtreeOps.js";
import {PolicyPicker, PolicyPicker_Button} from "../../../../../Database/Policies/PolicyPicker.js";
import {SubtreeIncludeKeys} from "./SubtreeOpsHelpers.js";

const splitAt = 150;

export class SubtreeOpsUI_SetAccessPolicy_Left extends BaseComponentPlus(
	{} as {} & MI_SharedProps,
	{},
) {
	render() {
		let {} = this.props;
		const {} = this.state;
		const dialogState = store.main.maps.subtreeOperationsDialog;

		return (
			<>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>TODO:</Text>
				</RowLR>
			</>
		);
	}
}

@Observer
export class SubtreeOpsUI_SetAccessPolicy_Right extends BaseComponent<{} & MI_SharedProps, {retrievalActive: boolean, newPolicyID: string}> {
	render() {
		const {mapID, node: rootNode, path: rootNodePath} = this.props;
		const {retrievalActive, newPolicyID} = this.state;
		const dialogState = store.main.maps.subtreeOperationsDialog;
		//const includeKeys = dialogState.export_includeKeys;
		const includeKeys_minimal = new SubtreeIncludeKeys({
			nodes: ["id"],
			nodeLinks: [],
			nodeRevisions: [],
			nodePhrasings: [],
			terms: [],
			medias: [],
		});

		const newPolicy = GetAccessPolicy(this.state.newPolicyID);

		const {subtreeData} = useSubtreeRetrievalQueryOrAccessors(rootNode, rootNodePath, includeKeys_minimal, dialogState.retrievalMethod, dialogState.maxExportDepth, retrievalActive);
		const nodesRetrieved = subtreeData?.nodes?.length ?? 0;

		return (
			<Column style={{flex: 1}}>
				<Row>
					<CheckBox text={`Start retrieval${nodesRetrieved > 0 ? ` (node count: ${nodesRetrieved})` : ""}`} value={retrievalActive} onChange={val=>this.SetState({retrievalActive: val})}/>
					<Row ml="auto"></Row>
				</Row>
				<RowLR mt={5} splitAt={splitAt}>
					<Text>New access-policy:</Text>
					<PolicyPicker containerStyle={{flex: null}} value={newPolicyID} onChange={policyID=>this.SetState({newPolicyID: policyID})}>
						<PolicyPicker_Button policyID={newPolicyID} idTrimLength={3} style={{padding: "3px 10px"}}/>
					</PolicyPicker>
				</RowLR>
			</Column>
		);
	}
}