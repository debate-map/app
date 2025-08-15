import {AttachmentType} from "dm_common";
import React from "react";
import {DetailsUI_Phase} from "UI/@Shared/DetailsUI_Base";
import {AttachmentsEditorUI} from "UI/Database/Terms/AttachmentsEditorUI";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI.js";

export const GetPhaseFromNodeDetailsUIProps = (props: {forNew: boolean, enabled: boolean}): DetailsUI_Phase=>{
	return props.enabled ? (props.forNew ? "create" : "edit") : "view";
}

export const AttachmentPanel = (props: NodeDetailsUI_SharedProps)=>{
	const {newRevisionData, forNew, enabled, Change} = props;

	return <AttachmentsEditorUI
		phase={GetPhaseFromNodeDetailsUIProps({forNew, enabled: enabled!})}
		target="node"
		baseData={newRevisionData.attachments}
		onChange={val=>Change(newRevisionData.attachments = val)}
		allowedAttachmentTypes={[AttachmentType.references, AttachmentType.quote, AttachmentType.media, AttachmentType.equation, AttachmentType.description]}
	/>;
};
