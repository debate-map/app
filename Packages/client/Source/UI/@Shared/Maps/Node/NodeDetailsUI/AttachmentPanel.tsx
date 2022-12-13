import {AttachmentType, GetAttachmentType_Node} from "dm_common";
import {DEL} from "js-vextensions";
import React from "react";
import {AttachmentEditorUI} from "UI/@Shared/Attachments/AttachmentEditorUI";
import {DetailsUI_Phase} from "UI/@Shared/DetailsUI_Base";
import {AttachmentsEditorUI} from "UI/Database/Terms/AttachmentsEditorUI";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

/*export function CanNodeHaveAttachments(node: NodeL1) {
	//return node.type == NodeType.claim;
	// maybe temp; allow attachments on everything except arguments (disallowed since attachment should just be added to its premise in that case)
	return node.type != NodeType.argument;
}*/

export function GetPhaseFromNodeDetailsUIProps(props: {forNew: boolean, enabled: boolean}): DetailsUI_Phase {
	return props.enabled ? (props.forNew ? "create" : "edit") : "view";
}

export class AttachmentPanel extends BaseComponent<NodeDetailsUI_SharedProps & {}, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		//const attachmentType = GetAttachmentType_Node(newDataAsL2);
		//const canHaveAttachments = CanNodeHaveAttachments(newData);
		return <AttachmentsEditorUI phase={GetPhaseFromNodeDetailsUIProps({forNew, enabled: enabled!})} target="node"
			baseData={newRevisionData.attachments} onChange={val=>Change(newRevisionData.attachments = val)}
			allowedAttachmentTypes={[AttachmentType.references, AttachmentType.quote, AttachmentType.media, AttachmentType.equation]}/>;
	}
}