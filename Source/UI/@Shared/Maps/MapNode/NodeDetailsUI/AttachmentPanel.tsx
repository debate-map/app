import {GetEntries} from "js-vextensions";
import {Row, Select, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {AttachmentType, ResetNodeRevisionAttachment, GetAttachmentType} from "Store/firebase/nodeRevisions/@AttachmentType";
import {GetOpenMapID} from "Store/main";
import {MapNodeRevision_Defaultable, PermissionInfoType} from "../../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNodeType} from "../../../../../Store/firebase/nodes/@MapNodeType";
import {EquationEditorUI} from "./AttachmentPanel/EquationEditorUI";
import {ImageAttachmentEditorUI} from "./AttachmentPanel/ImageAttachmentEditorUI";
import {QuoteInfoEditorUI} from "./AttachmentPanel/QuoteInfoEditorUI";
import {NodeDetailsUI_SharedProps} from "../NodeDetailsUI";
import {ReferencesAttachmentEditorUI} from "./AttachmentPanel/ReferencesAttachmentEditorUI";

export class AttachmentPanel extends BaseComponent<NodeDetailsUI_SharedProps & {}, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change} = this.props;
		const attachmentType = GetAttachmentType(newDataAsL2);

		return (
			<>
				{newData.type != MapNodeType.Claim &&
					<Text>Only claim nodes can have attachments.</Text>}
				{newData.type == MapNodeType.Claim &&
				<>
					<Row mb={attachmentType == AttachmentType.None ? 0 : 5}>
						<Text>Type:</Text>
						<Select ml={5} options={GetEntries(AttachmentType)} enabled={enabled} value={attachmentType} onChange={val=>{
							ResetNodeRevisionAttachment(newRevisionData, val);
							Change();
						}}/>
					</Row>
					{attachmentType == AttachmentType.Equation &&
						<EquationEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.equation} onChange={val=>Change(newRevisionData.equation = val)}/>}
					{attachmentType == AttachmentType.Quote &&
						<QuoteInfoEditorUI /*ref={c=>this.quoteEditor = c}*/ creating={forNew} editing={enabled}
							baseData={newRevisionData.quote} onChange={val=>Change(newRevisionData.quote = val)}
							showPreview={false} justShowed={false}/>}
					{attachmentType == AttachmentType.References &&
						<ReferencesAttachmentEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.references} onChange={val=>Change(newRevisionData.references = val)}
							showPreview={false} justShowed={false}/>}
					{attachmentType == AttachmentType.Image &&
						<ImageAttachmentEditorUI creating={forNew} editing={enabled}
							baseData={newRevisionData.image} onChange={val=>Change(newRevisionData.image = val)}/>}
				</>}
			</>
		);
	}
}