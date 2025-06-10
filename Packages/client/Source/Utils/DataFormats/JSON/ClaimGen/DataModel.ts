import {Attachment, AttachmentType, DescriptionAttachment, NodeType, QuoteAttachment, ReferencesAttachment, Source, SourceChain, SourceType} from "dm_common";
import {Assert, IsString} from "js-vextensions";
import {AssertUnreachable} from "web-vcore";

export const CG_Node_KeyForChildArray_values = ["questions", "positions", "categories", "claims", "arguments", "premises", "atomic_claims", "counter_claims", "examples"] as const;
export type CG_Node_KeyForChildArray = typeof CG_Node_KeyForChildArray_values[number];

export class CG_Node {
	constructor(data: Partial<CG_Node>, _originCollectionName: CG_Node_KeyForChildArray) {
		Object.assign(this, data, {_originCollectionName});
	}

	static GetNodeType(node: CG_Node): NodeType {
		// special cases (where node-type is based on the node's own fields, rather than what children-collection it was sourced from)
		// ==========

		// special case: if a "premises" field is present, then this is a multi-premise argument-node
		if (node.premises != null) return NodeType.argument;
		// special case: if an "atomic_claims" field is present, then this is a multi-premise argument-node
		if (node.atomic_claims != null) return NodeType.argument;

		// deprecated: handle type-specific text-fields
		if (node.question != null) return NodeType.category
		if (node.position != null) return NodeType.claim;
		if (node.category != null) return NodeType.category;
		if (node.claim != null) return NodeType.claim;
		if (node.argument != null) return NodeType.claim;

		// standard case (where node-type is based on the children-collection it was sourced from)
		// ==========

		if (node._originCollectionName == "questions") return NodeType.category;
		if (node._originCollectionName == "positions") return NodeType.claim;
		if (node._originCollectionName == "categories") return NodeType.category;
		if (node._originCollectionName == "claims") return NodeType.claim;
		if (node._originCollectionName == "arguments") return NodeType.claim;
		if (node._originCollectionName == "premises") return NodeType.claim;
		if (node._originCollectionName == "atomic_claims") return NodeType.claim;
		if (node._originCollectionName == "counter_claims") return NodeType.claim;
		if (node._originCollectionName == "examples") return NodeType.claim;
		// if this is the root layer (ie. "_originCollectionName" is null), then assume the node it represents is a category-node (eg. question)
		// (note: if the "text" field is missing, this "CG_Node" instance will actually not be interpreted as a node itself, so this node-type will be ignored anyway)
		if (node._originCollectionName == null) {
			console.warn("Cannot discern node-type for CG_Node, so using fallback node-type of category. @data: " + JSON.stringify(node, function(key, value) {
				// for children-object collections, just show the number of children, to avoid cluttering the error message
				if (CG_Node_KeyForChildArray_values.includes(key as any) && Array.isArray(value)) {
					return `<children count: ${value.length}; actual json omitted for brevity>`;
				}
				return value;
			}, "\t"));
			return NodeType.category;
		}
		AssertUnreachable(node._originCollectionName, `Unknown cg-node collection-name: ${node._originCollectionName}`);
	}

	// special fields (added by importer itself, during interpretation process)
	// ==========

	_originCollectionName?: CG_Node_KeyForChildArray;

	// text/title fields (these fields are named differently, but they're all equivalent, as just the "text" of the node)
	// ==========

	text?: string;
	// deprecated: these fields are now just aliases for "text", but are kept for now for backwards-compatibility
	question?: string;
	position?: string;
	category?: string;
	claim?: string;
	argument?: string;

	static GetText(node: CG_Node) {
		const d = node as any;
		const result_raw = d.text
			// deprecated
			?? d.question ?? d.position ?? d.category ?? d.claim ?? d.argument;
		const result = (result_raw ?? "").trim(); // fsr, some json files contain line-breaks at start or end, so clean this up
		return result.length ? result : "";
	}

	// children fields
	// ==========

	// arrays of objects (entries in any of these arrays are interpreted as "children nodes" -- though some [eg. "premises"], also has the side-effect of causing this node's type to be "argument")
	questions?: CG_Node[];
	positions?: CG_Node[];
	categories?: CG_Node[];
	claims?: CG_Node[];
	arguments?: CG_Node[];
	premises?: CG_Node[];  // side-effect: if this field is present, then the node-type is forced to "argument"

	// arrays of strings or objects (support for strings is deprecated, but kept temporarily)
	atomic_claims?: (string|CG_Node)[]; // side-effect: if this field is present, then the node-type is forced to "argument"
	counter_claims?: (string|CG_Node)[];
	examples?: (string|CG_Node)[];

	static GetChildren(node: CG_Node): CG_Node[] {
		const cgNode_fromObj = (data: CG_Node, collection: CG_Node_KeyForChildArray)=>{
			Assert(typeof data == "object", `Expected entry in collection "${collection}" to be an object, but found: ${JSON.stringify(data)}`);
			return new CG_Node(data, collection);
		};
		const cgNode_fromStringOrObj = (data: string|CG_Node, collection: CG_Node_KeyForChildArray)=>{
			if (typeof data == "string") return new CG_Node({text: data}, collection); // deprecated, but kept temporarily
			return new CG_Node(data, collection);
		}
		return [
			node.questions?.map(a=>cgNode_fromObj(a, "questions")),
			node.positions?.map(a=>cgNode_fromObj(a, "positions")),
			node.categories?.map(a=>cgNode_fromObj(a, "categories")),
			node.claims?.map(a=>cgNode_fromObj(a, "claims")),
			node.arguments?.map(a=>cgNode_fromObj(a, "arguments")),
			node.premises?.map(a=>cgNode_fromObj(a, "premises")),
			node.atomic_claims?.map(a=>cgNode_fromStringOrObj(a, "atomic_claims")),
			node.counter_claims?.map(a=>cgNode_fromStringOrObj(a, "counter_claims")),
			node.examples?.map(a=>cgNode_fromStringOrObj(a, "examples")),
		].flatMap(a=>a ?? []);
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