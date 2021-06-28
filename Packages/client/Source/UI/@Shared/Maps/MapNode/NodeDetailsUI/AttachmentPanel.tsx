import {GetEntries} from "web-vcore/nm/js-vextensions";
import {Row, Select, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {EquationEditorUI} from "./AttachmentPanel/EquationEditorUI";
import {MediaAttachmentEditorUI as MediaAttachmentEditorUI} from "./AttachmentPanel/MediaAttachmentEditorUI";
import {QuoteInfoEditorUI} from "./AttachmentPanel/QuoteInfoEditorUI";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";
import {ReferencesAttachmentEditorUI} from "./AttachmentPanel/ReferencesAttachmentEditorUI";
import {GetAttachmentType, AttachmentType, ResetNodeRevisionAttachment} from "dm_common";
import {MapNodeType} from "dm_common";

export class AttachmentPanel extends BaseComponent<NodeDetailsUI_SharedProps & {}, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		return (
			<>
				{newData.type != MapNodeType.claim &&
					<Text>Only claim nodes can have attachments.</Text>}
				{newData.type == MapNodeType.claim &&
				<>
					<Row mb={attachmentType == AttachmentType.none ? 0 : 5}>
						<Text>Type:</Text>
						<Select ml={5} options={GetEntries(AttachmentType)} enabled={enabled} value={attachmentType} onChange={val=>{
							ResetNodeRevisionAttachment(newRevisionData, val);
							Change();
						}}/>
					</Row>
					{attachmentType == AttachmentType.equation &&
						<EquationEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.equation} onChange={val=>Change(newRevisionData.equation = val)}/>}
					{attachmentType == AttachmentType.quote &&
						<QuoteInfoEditorUI /*ref={c=>this.quoteEditor = c}*/ creating={forNew} editing={enabled}
							baseData={newRevisionData.quote} onChange={val=>Change(newRevisionData.quote = val)}
							showPreview={false} justShowed={false}/>}
					{attachmentType == AttachmentType.references &&
						<ReferencesAttachmentEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.references} onChange={val=>Change(newRevisionData.references = val)}
							showPreview={false} justShowed={false}/>}
					{attachmentType == AttachmentType.media &&
						<MediaAttachmentEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.media} onChange={val=>Change(newRevisionData.media = val)}/>}
				</>}
			</>
		);
	}
}