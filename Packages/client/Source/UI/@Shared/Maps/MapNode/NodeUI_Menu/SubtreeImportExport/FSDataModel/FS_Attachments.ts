// classes to help with importing data from old firestore-based version of Debate Map
// from: https://github.com/debate-map/server-old/tree/master/Source/%40Shared/Store/firebase/nodeRevisions

export enum FS_AttachmentType {
	None = 10,
	// ImpactPremise = 20,
	Equation = 20,
	References = 30,
	Quote = 40,
	Media = 50,
}
export class FS_EquationAttachment {
	latex: boolean;
	text = "";
	isStep? = true;
	explanation = null as string|n;
}
export class FS_MediaAttachment {
	id: string;
	captured: boolean; // whether the image/video is claimed to be a capturing of real-world footage
	previewWidth: number; // used to limit the display-width, eg. to keep a tall-but-skinny image from extending multiple screens down
	sourceChains: FS_SourceChain[];
}
export class FS_QuoteAttachment {
	content = "";
	sourceChains: FS_SourceChain[];
}
export class FS_ReferencesAttachment {
	sourceChains: FS_SourceChain[];
}
export class FS_SourceChain {
	sources: FS_Source[];
}
export enum FS_SourceType {
	Speech = 10,
	Text = 20,
	Image = 30,
	Video = 40,
	Webpage = 50,
}
export class FS_Source {
	type = FS_SourceType.Webpage;

	// uses with * means shown in the main row (rather than in dropdown)
	name: string; // used by: Speech, Text*
	author: string; // used by: Speech*, Text*, Image*, Video*
	location: string; // used by: Speech*, Image*, Video*
	time_min: number; // used by: Speech, Text, Image, Video, Webpage
	time_max: number; // used by: Speech, Text, Image, Video, Webpage
	link: string; // used by: Webpage*
}
export class FS_TermAttachment {
	id: string;
}