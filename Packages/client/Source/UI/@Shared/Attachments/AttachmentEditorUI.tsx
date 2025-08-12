import {GetEntries, GetValues, NN} from "js-vextensions";
import {CheckBox, Row, Select, Text} from "react-vcomponents";
import {AttachmentType, ResetAttachment, Attachment, GetAttachmentType, AttachmentTarget} from "dm_common";
import {EquationEditorUI} from "./AttachmentPanel/EquationEditorUI.js";
import {MediaAttachmentEditorUI} from "./AttachmentPanel/MediaAttachmentEditorUI.js";
import {QuoteInfoEditorUI} from "./AttachmentPanel/QuoteInfoEditorUI.js";
import {ReferencesAttachmentEditorUI} from "./AttachmentPanel/ReferencesAttachmentEditorUI.js";
import {DescriptionAttachmentEditorUI} from "./AttachmentPanel/DescriptionAttachmentEditorUI.js";
import React from "react";
import {DetailsUIBaseProps, useDetailsUI} from "../DetailsUI_Base.js";

export type AttachmentEditorUIProps = DetailsUIBaseProps<Attachment,
    {
        target: AttachmentTarget;
        allowedAttachmentTypes?: AttachmentType[];
        setExpandedByDefault: (val: boolean) => any;
    }
>;

export const AttachmentEditorUI = (props: AttachmentEditorUIProps)=>{
	const {phase, target, allowedAttachmentTypes, setExpandedByDefault, baseData, onChange} = props;
	const {newData, helpers} = useDetailsUI<Attachment>({
        baseData,
        phase,
        onChange,
	});
	const {enabled, Change} = helpers;

	const attachmentType = GetAttachmentType(newData);
	const allowedTypes = allowedAttachmentTypes ?? GetValues(AttachmentType);

	const typeOptions = GetEntries(AttachmentType, "ui").filter(opt=>allowedTypes.includes(opt.value));
	return (
        <>
			<Row mb={attachmentType == AttachmentType.none ? 0 : 5}>
				<Text>Type:</Text>
				<Select ml={5} options={typeOptions} enabled={enabled} value={attachmentType} onChange={val=>{
					ResetAttachment(newData, val);
					Change();
				}}/>
				<CheckBox ml={5} enabled={enabled} text="Expanded by default" value={newData.expandedByDefault ?? false} onChange={val=>setExpandedByDefault(val)}/>
			</Row>

			{attachmentType == AttachmentType.equation &&
				<EquationEditorUI phase={phase} baseData={NN(newData.equation)} onChange={val=>Change(newData.equation = val)}/>}

			{attachmentType == AttachmentType.quote &&
				<QuoteInfoEditorUI phase={phase} baseData={NN(newData.quote)} onChange={val=>Change(newData.quote = val)}/>}

			{attachmentType == AttachmentType.references &&
				<ReferencesAttachmentEditorUI phase={phase} baseData={NN(newData.references)} onChange={val=>Change(newData.references = val)}/>}

			{attachmentType == AttachmentType.media &&
				<MediaAttachmentEditorUI phase={phase} baseData={NN(newData.media)} onChange={val=>Change(newData.media = val)} target={target}/>}

			{attachmentType == AttachmentType.description &&
				<DescriptionAttachmentEditorUI phase={phase} baseData={NN(newData.description)} onChange={val=>Change(newData.description = val)}/>}

        </>
	);
}
