import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import {Column, Pre, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ReferencesAttachment, GetNodeDisplayText, NodeType, ClaimForm} from "dm_common";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "../../Maps/MapNode/SourceChainsEditorUI.js";
import {SubPanel_Quote, SubPanel_References} from "../../Maps/MapNode/NodeUI_Inner/SubPanel.js";

export class ReferencesAttachmentEditorUI extends DetailsUI_Base<ReferencesAttachment, ReferencesAttachmentEditorUI> {
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
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI|n;
	GetValidationError_Extras() {
		return this.chainsEditor?.GetValidationError();
	}

	GetNewData_PostProcess(newData: ReferencesAttachment) {
		CleanUpdatedReferencesAttachment(newData);
	}
}

export function CleanUpdatedReferencesAttachment(attachment: ReferencesAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
}