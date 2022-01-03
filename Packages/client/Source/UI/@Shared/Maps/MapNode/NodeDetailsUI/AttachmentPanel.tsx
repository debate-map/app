import {GetAttachmentType_Node} from "dm_common";
import {DEL} from "js-vextensions";
import React from "react";
import {AttachmentEditorUI} from "UI/@Shared/Attachments/AttachmentEditorUI";
import {DetailsUI_Phase} from "UI/@Shared/DetailsUI_Base";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";

/*export function CanNodeHaveAttachments(node: MapNode) {
	//return node.type == MapNodeType.claim;
	// maybe temp; allow attachments on everything except arguments (disallowed since attachment should just be added to its premise in that case)
	return node.type != MapNodeType.argument;
}*/

export function GetPhaseFromNodeDetailsUIProps(props: {forNew: boolean, enabled: boolean}): DetailsUI_Phase {
	return props.enabled ? (props.forNew ? "create" : "edit") : "view";
}

export class AttachmentPanel extends BaseComponent<NodeDetailsUI_SharedProps & {}, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		//const attachmentType = GetAttachmentType_Node(newDataAsL2);

		//const canHaveAttachments = CanNodeHaveAttachments(newData);
		return <AttachmentEditorUI phase={GetPhaseFromNodeDetailsUIProps({forNew, enabled: enabled!})}
			target="node"
			baseData={newRevisionData}
			onChange={val=>{
				newRevisionData.VSet({
					equation: val.equation ?? DEL,
					references: val.references ?? DEL,
					quote: val.quote ?? DEL,
					media: val.media ?? DEL,
				});
				Change();
			}}/>;
	}
}