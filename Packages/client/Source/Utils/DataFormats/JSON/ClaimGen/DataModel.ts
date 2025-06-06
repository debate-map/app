import {Attachment, AttachmentType, DescriptionAttachment, NodeType, QuoteAttachment, ReferencesAttachment, Source, SourceChain, SourceType} from "dm_common";
import {Assert, IsString} from "js-vextensions";

export const CG_Node_keysForChildrenObjects: Array<keyof CG_Node> = ["positions", "categories", "claims", "arguments"] as const;
export class CG_Node {
	constructor(data: Partial<CG_Node>, _isSyntheticNodeObj_fromStringCollection: "atomic_claims" | "counter_claims" | "examples") {
		Object.assign(this, data, {_isSyntheticNodeObj_fromStringCollection});
	}

	static GetNodeType(node: CG_Node): NodeType {
		// special case: if `atomic_claims` is non-null, then this is a multi-premise argument-node
		if (node.atomic_claims) return NodeType.argument;

		if (node.question) return NodeType.category
		if (node.position) return NodeType.claim;
		if (node.category) return NodeType.category;
		if (node.claim) return NodeType.claim;
		if (node.argument) return NodeType.claim;
		if (node.text) {
			// try to discern node-type based on what collection of strings this synthetically-created-node-obj was sourced from
			if (node._isSyntheticNodeObj_fromStringCollection == "atomic_claims") return NodeType.claim;
			if (node._isSyntheticNodeObj_fromStringCollection == "counter_claims") return NodeType.claim;
			if (node._isSyntheticNodeObj_fromStringCollection == "examples") return NodeType.claim;
		}

		console.warn("Cannot discern node-type for CG_Node, so using fallback node-type of category. @data: " + JSON.stringify(node, function(key, value) {
			// for children-object collections, just show the number of children, to avoid cluttering the error message
			if (CG_Node_keysForChildrenObjects.includes(key as any) && Array.isArray(value)) {
				return `<children count: ${value.length}; actual json omitted for brevity>`;
			}
			return value;
		}, "\t"));
		return NodeType.category; // fallback node-type (can happen for claim-gen exports that are just a "root node" with an "arguments" children-collection, but no text or anything for that root container-node)
	}

	// special fields (added by importer itself, during interpretation process)
	// ==========

	_isSyntheticNodeObj_fromStringCollection?: "atomic_claims" | "counter_claims" | "examples";

	// text/title fields (these fields are named differently, but they're all equivalent, as just the "text" of the node)
	// ==========

	question?: string;
	position?: string;
	category?: string;
	claim?: string;
	argument?: string;
	text?: string; // synthetically added by the importer, for plain string entries in the "examples", "atomic_claims", and "counter_claims" arrays

	static GetText(node: CG_Node) {
		const d = node as any;
		const result_raw = d.question ?? d.position ?? d.category ?? d.claim ?? d.argument;
		const result = (result_raw ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : "";
	}

	// children fields
	// ==========

	// arrays of objects (these fields are named differently, but they're all equivalent, as just "children nodes" of the node)
	positions?: CG_Node[];
	categories?: CG_Node[];
	claims?: CG_Node[];
	arguments?: CG_Node[];

	// arrays of strings
	atomic_claims?: string[];
	counter_claims?: string[];
	examples?: string[];

	static GetChildren(node: CG_Node): CG_Node[] {
		const childrenFromObjects = [
			node.positions,
			node.categories,
			node.claims,
			node.arguments,
		].flatMap(a=>a ?? []);

		const childrenFromSimpleStrings = [] as CG_Node[];
		if (node.atomic_claims) {
			for (const entryText of node.atomic_claims) {
				Assert(IsString(entryText), `Expected "atomic_claims" to be an array of strings, but found: ${JSON.stringify(node.examples)}`);
				childrenFromSimpleStrings.push(new CG_Node({text: entryText}, "atomic_claims"));
			}
		}
		if (node.counter_claims) {
			for (const entryText of node.counter_claims) {
				Assert(IsString(entryText), `Expected "counter_claims" to be an array of strings, but found: ${JSON.stringify(node.examples)}`);
				childrenFromSimpleStrings.push(new CG_Node({text: entryText}, "counter_claims"));
			}
		}
		if (node.examples) {
			for (const entryText of node.examples) {
				Assert(IsString(entryText), `Expected "examples" to be an array of strings, but found: ${JSON.stringify(node.examples)}`);
				childrenFromSimpleStrings.push(new CG_Node({text: entryText}, "examples"));
			}
		}

		// add the simple-string-children first, since they're shallower/non-recursive
		return [...childrenFromSimpleStrings, ...childrenFromObjects];
	}

	// other fields
	// ==========

	sources?: CG_Source[]; // these get imported as attachments (each as a "quote" attachment, but also one "references" attachment gets added as the first attachment, containing all source urls)

	static GetAttachments(node: CG_Node) {
		const result = [] as Attachment[];

		const sources = node.sources ?? [];
		const sourceURLs = sources.map(a=>a.url).filter(a=>IsString(a) && a.trim().length > 0);

		if (sourceURLs.length > 0) {
			result.push(new Attachment({
				references: new ReferencesAttachment({
					sourceChains: sourceURLs.map(url=>{
						return new SourceChain([
							new Source({type: SourceType.webpage, link: url}),
						]);
					}),
				}),
			}));
		}

		for (const source of sources) {
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

		return result;
	}
}
export class CG_Source {
	text: string;
	url: string;
}