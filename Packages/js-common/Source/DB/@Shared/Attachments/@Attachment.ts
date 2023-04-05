import {CE, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";
import {Field, MGLClass} from "mobx-graphlink";
import {NodeRevision} from "../../nodes/@NodeRevision.js";
import {QuoteAttachment} from "./@QuoteAttachment.js";
import {MediaAttachment} from "./@MediaAttachment.js";
import {NodeL2} from "../../nodes/@Node.js";
import {NodeType} from "../../nodes/@NodeType.js";
import {EquationAttachment} from "./@EquationAttachment.js";
import {ReferencesAttachment} from "./@ReferencesAttachment.js";
import {DescriptionAttachment} from "./@DescriptionAttachment.js";

export type AttachmentTarget = "node" | "term";

export enum AttachmentType {
	none = "none",
	equation = "equation",
	references = "references",
	quote = "quote",
	media = "media",
	description = "description",
}

export function GetAttachmentType_Node(node: NodeL2) {
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
		attachment.description ? AttachmentType.description :
		AttachmentType.none
	);
}

export function ResetAttachment(attachment: Attachment, attachmentType: AttachmentType, resetExpandedByDefaultForAllTypes = false) {
	CE(attachment).Extend({equation: null, references: null, quote: null, media: null, description: null});
	if (attachmentType == AttachmentType.equation || resetExpandedByDefaultForAllTypes) {
		attachment.expandedByDefault = false;
	}

	if (attachmentType == AttachmentType.equation) {
		attachment.equation = new EquationAttachment();
	} else if (attachmentType == AttachmentType.references) {
		attachment.references = new ReferencesAttachment();
	} else if (attachmentType == AttachmentType.quote) {
		attachment.quote = new QuoteAttachment();
	} else if (attachmentType == AttachmentType.media) {
		attachment.media = new MediaAttachment();
	} else if (attachmentType == AttachmentType.description) {
		attachment.description = new DescriptionAttachment();
	}
}

// attachment-holder class
// ==========

@MGLClass()
export class Attachment {
	constructor(data?: Partial<Attachment>) {
		Object.assign(this, data);
	}

	@Field({$ref: EquationAttachment.name}, {opt: true})
	expandedByDefault?: boolean;

	// components
	// ==========

	@Field({$ref: EquationAttachment.name}, {opt: true})
	equation?: EquationAttachment;

	@Field({$ref: ReferencesAttachment.name}, {opt: true})
	references?: ReferencesAttachment;

	@Field({$ref: QuoteAttachment.name}, {opt: true})
	quote?: QuoteAttachment;

	@Field({$ref: MediaAttachment.name}, {opt: true})
	media?: MediaAttachment;

	@Field({$ref: DescriptionAttachment.name}, {opt: true})
	description?: DescriptionAttachment;
}