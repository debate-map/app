import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "js-vextensions";
import {Column, Pre, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {ReferencesAttachment, GetNodeDisplayText, NodeType, ClaimForm, CleanUpdatedSourceChains} from "dm_common";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {SourceChainsEditorUI, SourceChainsEditorUIElem} from "../../Maps/Node/SourceChainsEditorUI.js";
import {SubPanel_Quote, SubPanel_References} from "../../Maps/Node/NodeBox/SubPanel.js";
import React from "react";

export class ReferencesAttachmentEditorUI extends DetailsUI_Base<ReferencesAttachment, ReferencesAttachmentEditorUI> {
	chainsEditor: SourceChainsEditorUIElem|n;
	render() {
		const {} = this.props;
		const {newData} = this.state;
		const {enabled, Change} = this.helpers;

		return (
			<Column>
				{/*showPreview && [
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: NodeType.claim, current: {references: CleanUpdatedReferencesAttachment(Clone(newData))}} as any, undefined, ClaimForm.base)}
							<SubPanel_References attachment={newData} fontSize={15}/>
						</Pre>
					</Column>,
				]*/}
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>{this.chainsEditor = c}} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/> </Row>
			</Column>
		);
	}
	GetValidationError_Extras() {
		return this.chainsEditor?.getValidationError();
	}

	GetNewData_PostProcess(newData: ReferencesAttachment) {
		CleanUpdatedReferencesAttachment(newData);
	}
}

export function CleanUpdatedReferencesAttachment(attachment: ReferencesAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
}
