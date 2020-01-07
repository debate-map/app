import {GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import {Column, Pre, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {ReferencesAttachment} from "Store/firebase/nodeRevisions/@ReferencesAttachment";
import {GetNodeDisplayText} from "../../../../../../Store/firebase/nodes/$node";
import {ClaimForm} from "../../../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../../../Store/firebase/nodes/@MapNodeType";
import {SubPanel_Quote, SubPanel_References} from "../../NodeUI_Inner/SubPanel";
import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "../../SourceChainsEditorUI";

export class ReferencesAttachmentEditorUI extends BaseComponent<
	{creating?: boolean, editing?: boolean, baseData: ReferencesAttachment, showPreview: boolean, justShowed: boolean, onChange?: (newData: ReferencesAttachment)=>void},
	{newData: ReferencesAttachment}
> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: Clone(props.baseData)}); }
	}

	render() {
		const {creating, editing, showPreview, justShowed, onChange} = this.props;
		const {newData} = this.state;
		const Change = _=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		return (
			<Column>
				{showPreview && [
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Claim, contentNode: CleanUpdatedReferencesAttachment(Clone(newData))} as any, null, ClaimForm.Base)}
							<SubPanel_References attachment={newData} fontSize={15}/>
						</Pre>
					</Column>,
				]}
				<Row mt={5}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		const {newData} = this.state;
		return CleanUpdatedReferencesAttachment(Clone(newData));
	}
}

export function CleanUpdatedReferencesAttachment(attachment: ReferencesAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
	return attachment;
}