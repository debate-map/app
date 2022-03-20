import {CE, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {Field, MGLClass} from "mobx-graphlink";
import {MapNodeRevision} from "../../nodes/@MapNodeRevision.js";
import {QuoteAttachment} from "./@QuoteAttachment.js";
import {MediaAttachment} from "./@MediaAttachment.js";
import {MapNodeL2} from "../../nodes/@MapNode.js";
import {MapNodeType} from "../../nodes/@MapNodeType.js";
import {EquationAttachment} from "./@EquationAttachment.js";
import {ReferencesAttachment} from "./@ReferencesAttachment.js";

export type AttachmentTarget = "node" | "term";

export enum AttachmentType {
	none = "none",
	//ImpactPremise: 1,
	references = "references",
	quote = "quote",
	media = "media",
	equation = "equation",
}

export function GetAttachmentType_Node(node: MapNodeL2) {
	const mainAttachment = node.current.attachments[0];
	if (mainAttachment == null) return AttachmentType.none;
	return GetAttachmentType(mainAttachment);
}
export function GetAttachmentType(attachment: Attachment) {
	return (
		attachment.equation ? AttachmentType.equation :
		attachment.references ? AttachmentType.references :
		attachment.quote ? AttachmentType.quote :
		attachment.media ? AttachmentType.media :
		AttachmentType.none
	);
}

export function ResetAttachment(attachment: Attachment, attachmentType: AttachmentType) {
	CE(attachment).Extend({equation: null, references: null, quote: null, media: null});
	if (attachmentType == AttachmentType.equation) {
		attachment.equation = new EquationAttachment();
	} else if (attachmentType == AttachmentType.references) {
		attachment.references = new ReferencesAttachment();
	} else if (attachmentType == AttachmentType.quote) {
		attachment.quote = new QuoteAttachment();
	} else if (attachmentType == AttachmentType.media) {
		attachment.media = new MediaAttachment();
	}
}

// attachment-holder class
// ==========

@MGLClass()
export class Attachment {
	constructor(data?: Partial<Attachment>) {
		this.VSet(data);
	}

	@Field({$ref: EquationAttachment.name}, {opt: true})
	equation?: EquationAttachment;

	@Field({$ref: ReferencesAttachment.name}, {opt: true})
	references?: ReferencesAttachment;

	@Field({$ref: QuoteAttachment.name}, {opt: true})
	quote?: QuoteAttachment;

	@Field({$ref: MediaAttachment.name}, {opt: true})
	media?: MediaAttachment;
}