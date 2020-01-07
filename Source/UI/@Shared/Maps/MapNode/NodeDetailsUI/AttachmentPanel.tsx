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

// @Observer
// export class PermissionsOptions extends BaseComponent<Pick<SharedProps, 'newData' | 'newRevisionData' | 'enabled' | 'Change'> & {forDefaultsInMap?: boolean}, {}> {
export class AttachmentPanel extends BaseComponent<NodeDetailsUI_SharedProps & {forDefaultsInMap?: boolean}, {}> {
	render() {
		const {newData, newDataAsL2, newRevisionData, forNew, enabled, Change, forDefaultsInMap} = this.props;
		const openMapID = GetOpenMapID();

		// probably temp
		if (newRevisionData.permission_edit == null) {
			newRevisionData.permission_edit = {type: PermissionInfoType.Creator};
		}
		if (newRevisionData.permission_contribute == null) {
			newRevisionData.permission_contribute = {type: PermissionInfoType.Anyone};
		}
		const attachmentType = GetAttachmentType(newDataAsL2);

		const splitAt = 80;
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