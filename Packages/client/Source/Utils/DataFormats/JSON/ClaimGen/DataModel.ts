import {Attachment, AttachmentType, DescriptionAttachment, QuoteAttachment, ReferencesAttachment, Source, SourceChain, SourceType} from "dm_common";
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
	extras?: object; // eg. {claimMiner: {id: "123"}}
}

// "source" entries are supposed to be imported as just attachments on the node itself (atm, always as Quote attachments)
// v6+?
// Note: Is this supposed to simply be a replacement of the CG_Quote structure? Dunno... (my guess is CG_Quote was claimminer's export-model, but CG_Source is claimgen's take on it)
export class CG_Source {
	text: string;
	url: string;
	score: number;
}

export abstract class CG_Node {
	id?: string; // deprecated, and ignored (and console.warn is called if input json uses this; new approach is to use extras.TOOL_NAMESPACE.id)
	narrative?: string;
	reference_urls?: CG_RefURLOrQuoteOld[];
	quotes?: CG_Quote[];
	sources?: CG_Source[]; // v6
	extras?: object; // eg. {claimMiner: {id: "123"}}

	//abstract GetTitle(): string;
	/** Get the regular, "standalone" text of the claim. (stored in debate-map as text_base) */
	static GetTitle_Main(node: CG_Node): string {
		const d = node as any;
		const result_raw =
			d.name ?? (d.questionText ?? d.question) ?? d.position ?? d.category ?? d.claim ??
			d.argument ?? d.original_example ?? d.example ?? d.text ??
			(d.quote ? `"${d.quote}"` : null);
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

		// not sure yet if sources are just the "new quotes", or something different/extra (see comment on CG_Source class for more thoughts)
		// so for now, do a separate loop to add them
		for (const source of node.sources ?? []) {
			result.push(new Attachment({
				quote: new QuoteAttachment({
					content: source.text,
					sourceChains: source.url != null ? [
						new SourceChain([
							{type: SourceType.webpage, link: source.url},
						]),
					] : [],
				}),
			}));
		}

		if (CG_Evidence.is(node)) {
			const evidence = node as CG_Evidence;
			if (evidence.url) {
				const sourceChains = evidence.url != null ? [
					new SourceChain([
						new Source({type: SourceType.webpage, link: evidence.url}),
					]),
				] : [];
				/*if (evidence.text) {
					result.push(new Attachment({
						references: new ReferencesAttachment({
							sourceChains,
						}),
					}));
				} else if (evidence.quote) {*/
				result.push(new Attachment({
					quote: new QuoteAttachment({
						content: evidence.quote,
						sourceChains,
					}),
				}));
			}
			if (evidence.reasoning) {
				result.push(new Attachment({
					description: new DescriptionAttachment({
						text: evidence.reasoning,
					}),
				}));
			}
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

	// v3 (tool extending claim-gen)
	arguments?: (string | CG_Argument)[];

	// v4
	counter_claim?: string;

	// v5
	examples?: (string | CG_Argument)[];
	counter_claims?: (string | CG_Argument)[];
}

// the distinction between "argument" and "example" is a bit unclear to me in the claimgen model; merging them atm
export class CG_Argument extends CG_Node {
	// when in "arguments" collection
	argument?: string;

	// when in "examples" collection
	original_example?: string; // <v6
	example?: string; // v6(a)
	text?: string; // v6(b)
	evidence?: CG_Evidence[]; // <v6? [maybe not deprecated, ie. maybe can occur alongside sources]
}

// "evidence" entries are supposed to be imported as separate nodes (eg. since supports/refutes needs a link-polarity to distinguish)
export class CG_Evidence extends CG_Node {
	quote: string;
	url: string;
	stance: "supports" | "refutes";
	reasoning: string;

	static is(node: CG_Node) {
		return (node as any).stance != null;
	}
}