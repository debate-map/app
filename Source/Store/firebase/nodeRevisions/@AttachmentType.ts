import {MapNodeRevision} from "../nodes/@MapNodeRevision";
import {QuoteAttachment} from "./@QuoteAttachment";
import {ImageAttachment} from "./@ImageAttachment";
import {MapNodeL2} from "../nodes/@MapNode";
import {MapNodeType} from "../nodes/@MapNodeType";
import {EquationAttachment} from "./@EquationAttachment";
import {ReferencesAttachment} from "./@ReferencesAttachment";

export enum AttachmentType {
	None = 10,
	// ImpactPremise = 20,
	Equation = 20,
	References = 30,
	Quote = 40,
	Image = 50,
}

export function GetAttachmentType(node: MapNodeL2) {
	return GetAttachmentType_Revision(node.current);
}
export function GetAttachmentType_Revision(revision: MapNodeRevision) {
	return (
		revision.equation ? AttachmentType.Equation
		: revision.references ? AttachmentType.References
		: revision.quote ? AttachmentType.Quote
		: revision.image ? AttachmentType.Image
		: AttachmentType.None
	);
}

export function ResetNodeRevisionAttachment(revision: MapNodeRevision, attachmentType: AttachmentType) {
	revision.Extend({equation: null, quote: null, image: null});
	if (attachmentType == AttachmentType.None) {
	} else if (attachmentType == AttachmentType.Equation) {
		revision.equation = new EquationAttachment();
	} else if (attachmentType == AttachmentType.References) {
		revision.references = new ReferencesAttachment();
	} else if (attachmentType == AttachmentType.Quote) {
		revision.quote = new QuoteAttachment();
	} else {
		revision.image = new ImageAttachment();
	}
}