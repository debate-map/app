import {Attachment, AttachmentType, QuoteAttachment, Source, SourceChain, SourceType} from "dm_common";
import {IsString} from "js-vextensions";

export type CG_RefURLOrQuoteOld = string | CG_QuoteOld;
// non-standard quote structure, as exported from alt claimgen instance (ie. the non-claim-miner one)
export class CG_QuoteOld {
	quote: string;
	url: string;
}

export class CG_Quote {
	quote: string;
	source: Source;
	extras?: Object; // eg. {claimMiner: {id: "123"}}
}

export abstract class CG_Node {
	id?: string; // deprecated, and ignored (and console.warn is called if input json uses this; new approach is to use extras.TOOL_NAMESPACE.id)
	narrative?: string;
	reference_urls?: CG_RefURLOrQuoteOld[];
	quotes?: CG_Quote[];
	extras?: Object; // eg. {claimMiner: {id: "123"}}

	//abstract GetTitle(): string;
	/** Get the regular, "standalone" text of the claim. (stored in debate-map as text_base) */
	static GetTitle_Main(node: CG_Node): string {
		const d = node as any;
		const result_raw = d.name ?? (d.questionText ?? d.question) ?? d.position ?? d.category ?? d.claim ?? d.argument;
		const result = (result_raw ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : null;
	}
	/** Get the "narrative" text of the claim, as displayed in the papers app. (stored in debate-map as text_narration) */
	static GetTitle_Narrative(node: CG_Node) {
		const result = (node.narrative ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : null;
	}
	static GetAttachments(node: CG_Node) {
		const result = [] as Attachment[];

		const referenceURLs = node.reference_urls && node.reference_urls.length > 0 ? node.reference_urls.filter(a=>IsString(a)) as string[] : [];
		const oldQuotes = node.reference_urls && node.reference_urls.length > 0 ? node.reference_urls.filter(a=>!IsString(a)) as CG_QuoteOld[] : [];
		if (referenceURLs.length > 0) {
			result.push(new Attachment({
				references: {
					sourceChains: referenceURLs.map(url=>{
						return new SourceChain([
							{type: SourceType.webpage, link: url},
						]);
					}),
				},
			}));
		}

		for (const quoteOld of oldQuotes) {
			result.push(new Attachment({
				quote: new QuoteAttachment({
					content: quoteOld.quote,
					sourceChains: [
						new SourceChain([
							{type: SourceType.webpage, link: quoteOld.url},
						]),
					],
				}),
			}));
		}
		for (const quote of node.quotes ?? []) {
			result.push(new Attachment({
				quote: new QuoteAttachment({
					content: quote.quote,
					sourceChains: quote.source != null ? [
						new SourceChain([quote.source]),
					] : [],
				}),
				extras: quote.extras,
			}));
		}

		return result;
	}
}

export class CG_Debate extends CG_Node {
	name: string;
	questions: CG_Question[];
}
export class CG_Question extends CG_Node {
	// v1
	questionText?: string; // deprecated, but processed atm
	// v2
	question?: string;

	positions: CG_Position[];
}
export class CG_Position extends CG_Node {
	position: string;
	categories: CG_Category[];
}
export class CG_Category extends CG_Node {
	category: string;
	claims: CG_Claim[];
}
export class CG_Claim extends CG_Node {
	// v1
	claim?: string;

	// v2
	argument?: string; // deprecated, but processed atm
	/*generated?: string;
	valid?: boolean;
	similarity?: boolean;
	edited?: boolean;*/

	// v2 (tool extending claim-gen)
	//arguments?: string[];

	// v3 (tool extending claim-gen)
	arguments?: (string | CG_Argument)[];

	// v4
	counter_claim?: string;
}
export class CG_Argument extends CG_Node {
	argument: string;
}