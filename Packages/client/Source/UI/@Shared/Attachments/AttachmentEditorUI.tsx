import {A, DEL, GetEntries, GetValues, NN} from "web-vcore/nm/js-vextensions.js";
import {CheckBox, Row, Select, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {GetAttachmentType_Node, AttachmentType, ResetAttachment, NodeType, NodeL1, Attachment, GetAttachmentType, AttachmentTarget} from "dm_common";
import {EquationEditorUI} from "./AttachmentPanel/EquationEditorUI.js";
import {MediaAttachmentEditorUI} from "./AttachmentPanel/MediaAttachmentEditorUI.js";
import {QuoteInfoEditorUI} from "./AttachmentPanel/QuoteInfoEditorUI.js";
import {NodeDetailsUI_SharedProps} from "../Maps/Node/NodeDetailsUI.js";
import {ReferencesAttachmentEditorUI} from "./AttachmentPanel/ReferencesAttachmentEditorUI.js";
import {DetailsUI_Base} from "../DetailsUI_Base.js";
import {DescriptionAttachmentEditorUI} from "./AttachmentPanel/DescriptionAttachmentEditorUI.js";

/*export function CanNodeHaveAttachments(node: NodeL1) {
	//return node.type == NodeType.claim;
	// maybe temp; allow attachments on everything except arguments (disallowed since attachment should just be added to its premise in that case)
	return node.type != NodeType.argument;
}*/

export class AttachmentEditorUI extends DetailsUI_Base<Attachment, {}, {target: AttachmentTarget, allowedAttachmentTypes?: AttachmentType[], setExpandedByDefault: (val: boolean)=>any}> {
	render() {
		const {phase, target, allowedAttachmentTypes, setExpandedByDefault} = this.props;
		const {newData} = this.state;
		const {enabled, Change} = this.helpers;
		const attachmentType = GetAttachmentType(newData);
		const allowedAttachmentTypes_final = allowedAttachmentTypes ?? GetValues(AttachmentType);

		//const canHaveAttachments = CanNodeHaveAttachments(newData);
		return (
			<>
				<Row mb={attachmentType == AttachmentType.none ? 0 : 5}>
					<Text>Type:</Text>
					<Select ml={5} options={GetEntries(AttachmentType, "ui").filter(a=>allowedAttachmentTypes_final.includes(a.value))} enabled={enabled} value={attachmentType} onChange={val=>{
						ResetAttachment(newData, val);
						Change();
					}}/>
					<CheckBox ml={5} enabled={enabled} text="Expanded by default" value={newData.expandedByDefault ?? false} onChange={val=>setExpandedByDefault(val)}/>
				</Row>
				{attachmentType == AttachmentType.equation &&
					<EquationEditorUI phase={phase} baseData={NN(newData.equation)} onChange={val=>Change(newData.equation = val)}/>}
				{attachmentType == AttachmentType.quote &&
					<QuoteInfoEditorUI phase={phase}
						baseData={NN(newData.quote)} onChange={val=>Change(newData.quote = val)}/>}
				{attachmentType == AttachmentType.references &&
					<ReferencesAttachmentEditorUI phase={phase}
						baseData={NN(newData.references)} onChange={val=>Change(newData.references = val)}/>}
				{attachmentType == AttachmentType.media &&
					<MediaAttachmentEditorUI phase={phase} baseData={NN(newData.media)} onChange={val=>Change(newData.media = val)} target={target}/>}
				{attachmentType == AttachmentType.description &&
					<DescriptionAttachmentEditorUI phase={phase}
						baseData={NN(newData.description)} onChange={val=>Change(newData.description = val)}/>}
			</>
		);
	}
}