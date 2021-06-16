import {GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "js-vextensions";
import {Column, Pre, Row} from "react-vcomponents";
import {BaseComponent, GetDOM} from "react-vextensions";
import {MarkdownEditor, MarkdownToolbar} from "react-vmarkdown";
import {ReferencesAttachment, GetNodeDisplayText, MapNodeType, ClaimForm} from "@debate-map/server-link/Source/Link";


import {SourceChainsEditorUI, CleanUpdatedSourceChains} from "../../SourceChainsEditorUI";
import {SubPanel_Quote, SubPanel_References} from "../../NodeUI_Inner/SubPanel";

export class ReferencesAttachmentEditorUI extends BaseComponent<
	{creating?: boolean, editing?: boolean, baseData: ReferencesAttachment, showPreview: boolean, justShowed: boolean, onChange?: (newData: ReferencesAttachment)=>void},
	{newData: ReferencesAttachment}
> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: CloneWithPrototypes(props.baseData)}); }
	}

	render() {
		const {creating, editing, showPreview, justShowed, onChange} = this.props;
		const {newData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};

		return (
			<Column>
				{showPreview && [
					<Row key={0}>Preview:</Row>,
					<Column key={1} mt={5}>
						<Pre style={{padding: 5, background: "rgba(255,255,255,.2)", borderRadius: 5}}>
							{GetNodeDisplayText({type: MapNodeType.Claim, current: {references: CleanUpdatedReferencesAttachment(Clone(newData))}} as any, null, ClaimForm.Base)}
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
		return CleanUpdatedReferencesAttachment(CloneWithPrototypes(newData));
	}
}

export function CleanUpdatedReferencesAttachment(attachment: ReferencesAttachment) {
	CleanUpdatedSourceChains(attachment.sourceChains);
	return attachment;
}