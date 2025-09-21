import {Column, Row} from "react-vcomponents";
import {ReferencesAttachment, CleanUpdatedSourceChains} from "dm_common";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base.js";
import {SourceChainsEditorUI, SourceChainsEditorUIElem} from "../../Maps/Node/SourceChainsEditorUI.js";
import React, {useRef} from "react";

export const ReferencesAttachmentEditorUI = (props: DetailsUIBaseProps<ReferencesAttachment, {}>)=>{
	const {baseData, phase, onChange} = props;

	const chainsEditorRef = useRef<SourceChainsEditorUIElem>(null);
	const {newData, helpers} = useDetailsUI<ReferencesAttachment>({
        baseData,
        phase,
        onChange,
		getNewDataPostProcess: v=>{
			CleanUpdatedReferencesAttachment(v);
		},
		getValidationErrorExtras: ()=>{
			const el = chainsEditorRef.current;
			return el?.isMounted && el.getValidationError();
		}
	});
	const {enabled, Change} = helpers;

	return (
		<Column>
			<Row mt={5}>
				<SourceChainsEditorUI ref={chainsEditorRef} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
			</Row>
		</Column>
	);
};

export const CleanUpdatedReferencesAttachment = (attachment: ReferencesAttachment)=>{
	CleanUpdatedSourceChains(attachment.sourceChains);
};
