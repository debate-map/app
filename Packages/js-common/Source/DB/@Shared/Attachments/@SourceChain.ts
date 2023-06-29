import {GetValues_ForSchema, Assert, CreateStringEnum, GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema} from "web-vcore/nm/mobx-graphlink.js";

// export type SourceChain = { [key: number]: Source; };
// export type SourceChainI = {[key: number]: Source;};
// export class SourceChain /*implements SourceChainI*/ {
/* export class SourceChain extends Array {
	[key: number]: Source;
	0 = new Source();
}; */
export class SourceChain {
	constructor(sources: Source[] = []) {
		this.sources = sources;
	}
	sources: Source[];
}
// AddSchema({patternProperties: {"^[A-Za-z0-9_-]+$": {$ref: "Source"}}, minProperties: 1}, "SourceChain");
AddSchema("SourceChain", {
	properties: {
		sources: {items: {$ref: "Source"}, minItems: 1},
	},
	required: ["sources"],
});

export enum SourceType {
	speech = "speech",
	text = "text",
	image = "image",
	video = "video",
	webpage = "webpage",
	// system-specific sources
	claimMiner = "claimMiner",
	hypothesisAnnotation = "hypothesisAnnotation",
}
AddSchema("SourceType", {enum: GetValues(SourceType)});

export const Source_linkURLPattern = "^https?://[^\\s/$.?#]+\\.[^\\s]+$";
export class Source {
	constructor(data?: Partial<Source>) {
		Object.assign(this, data);
	}

	type = SourceType.webpage;

	name?: string;
	author?: string;
	location?: string;
	// todo: either MS the time fields are only for type:video, or clarify their purpose in code and UI (eg. date-range of occurrence?)
	time_min?: number;
	time_max?: number;
	link?: string;

	// for system-specific sources
	claimMinerId?: string;
	hypothesisAnnotationId?: string;

	extras?: {[key: string]: any};
}
AddSchema("Source", {
	properties: {
		type: {$ref: "SourceType"},
		name: {pattern: "\\S.*"},
		author: {pattern: "\\S.*"},
		location: {type: "string"},
		time_min: {type: "number"},
		time_max: {type: "number"},
		//link: { format: 'uri' },
		//link: { pattern: Source_linkURLPattern },
		link: {type: "string"}, // allow overriding url pattern; it just highlights possible mistakes
		claimMinerId: {type: "string"},
		hypothesisAnnotationId: {type: "string"},
		extras: {type: "object"},
	},
});

type SourceTypeFieldSet = {main: Array<keyof Source>, extra: Array<keyof Source>};
export const sourceType_allFieldsOfTypes: Array<keyof Source> = ["name", "author", "location", "time_min", "time_max", "link", "claimMinerId", "hypothesisAnnotationId"];
export const sourceType_fieldSets = new Map<SourceType, SourceTypeFieldSet>([
	[SourceType.speech, {main: ["location", "author"], extra: ["name", "time_min", "time_max"]}],
	[SourceType.text, {main: ["name", "author"], extra: ["time_min", "time_max"]}],
	[SourceType.image, {main: ["location", "author"], extra: ["name", "time_min", "time_max"]}],
	[SourceType.video, {main: ["location", "author"], extra: ["name", "time_min", "time_max"]}],
	[SourceType.webpage, {main: ["link"], extra: ["author", "time_min", "time_max"]}],
	[SourceType.claimMiner, {main: ["claimMinerId"], extra: []}],
	[SourceType.hypothesisAnnotation, {main: ["hypothesisAnnotationId"], extra: []}],
]);

export function CleanUpdatedSourceChains(sourceChains: SourceChain[]) {
	// clean data (according to rules defined in field-sets map above)
	for (const chain of sourceChains) {
		for (const source of chain.sources) {
			const fieldsNotForThisType = sourceType_allFieldsOfTypes.Exclude(...sourceType_fieldSets.get(source.type)!.main, ...sourceType_fieldSets.get(source.type)!.extra);
			for (const field of fieldsNotForThisType) {
				delete source[field];
			}
		}
	}
	return sourceChains;
}

export function GetSourceNamePlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.speech) return "speech name";
	if (sourceType == SourceType.text) return "book/document name";
	if (sourceType == SourceType.image) return "image name";
	if (sourceType == SourceType.video) return "video name";
	// if (sourceType == SourceType.Webpage) return "(webpage name)";
	Assert(false);
}
export function GetSourceAuthorPlaceholderText(sourceType: SourceType) {
	if (sourceType == SourceType.speech) return "speaker";
	if (sourceType == SourceType.text) return "book/document author";
	if (sourceType == SourceType.image) return `image author`;
	if (sourceType == SourceType.video) return "video author";
	if (sourceType == SourceType.webpage) return "webpage author";
	Assert(false);
}