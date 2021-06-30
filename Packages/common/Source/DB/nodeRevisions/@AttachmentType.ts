import {MapNodeRevision} from "../nodes/@MapNodeRevision.js";
import {QuoteAttachment} from "./@QuoteAttachment.js";
import {MediaAttachment} from "./@MediaAttachment.js";
import {MapNodeL2} from "../nodes/@MapNode.js";
import {MapNodeType} from "../nodes/@MapNodeType.js";
import {EquationAttachment} from "./@EquationAttachment.js";
import {ReferencesAttachment} from "./@ReferencesAttachment.js";
import {CE, CreateStringEnum} from "web-vcore/nm/js-vextensions.js";

export enum AttachmentType {
	none = "none",
	//ImpactPremise: 1,
	equation = "equation",
	references = "references",
	quote = "quote",
	media = "media",
}

export function GetAttachmentType(node: MapNodeL2) {
	return GetAttachmentType_Revision(node.current);
}
export function GetAttachmentType_Revision(revision: MapNodeRevision) {
	return (
		revision.equation ? AttachmentType.equation
		: revision.references ? AttachmentType.references
		: revision.quote ? AttachmentType.quote
		: revision.media ? AttachmentType.media
		: AttachmentType.none
	);
}

export function ResetNodeRevisionAttachment(revision: MapNodeRevision, attachmentType: AttachmentType) {
	CE(revision).Extend({equation: null, references: null, quote: null, media: null});
	if (attachmentType == AttachmentType.equation) {
		revision.equation = new EquationAttachment();
	} else if (attachmentType == AttachmentType.references) {
		revision.references = new ReferencesAttachment();
	} else if (attachmentType == AttachmentType.quote) {
		revision.quote = new QuoteAttachment();
	} else if (attachmentType == AttachmentType.media) {
		revision.media = new MediaAttachment();
	}
}