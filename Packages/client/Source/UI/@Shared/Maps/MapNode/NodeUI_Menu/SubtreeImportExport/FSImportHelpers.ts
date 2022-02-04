import {ArgumentType, ChildGroup, ClaimForm, CullMapNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, MapNode, MapNodePhrasing, MapNodePhrasingType, MapNodeRevision, MapNodeType, MapNodeType_Info, MediaAttachment, NodeChildLink, Polarity, QuoteAttachment, ReferencesAttachment, Source, SourceChain, SourceType, systemUserID} from "dm_common";
import {ModifyString} from "js-vextensions";
import {Command, CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {FS_SourceChain, FS_SourceType} from "./FSDataModel/FS_Attachments.js";
import {FS_ClaimForm, FS_MapNode, FS_MapNodeL3, FS_MapNodeType, FS_Polarity} from "./FSDataModel/FS_MapNode.js";
import {FS_ArgumentType} from "./FSDataModel/FS_MapNodeRevision.js";

export class ImportResource {
	path: number[];
}
export class IR_NodeAndRevision extends ImportResource {
	constructor(data?: Partial<IR_NodeAndRevision>) {
		super();
		this.VSet(data);
	}
	link: NodeChildLink;
	node: MapNode;
	revision: MapNodeRevision;
	CanSearchByTitle() {
		return this.revision.phrasing.text_base.trim().length > 0;
	}
}

type MapNode_WithPath = MapNode & {path: number[]};
export const GetResourcesInImportSubtree = CreateAccessor((data: FS_MapNodeL3, id?: string, path: number[] = [])=>{
	const result = [] as ImportResource[];

	const node = new MapNode({
		id: id ?? GenerateUUID(),
		type: data.type ? ModifyString(FS_MapNodeType[data.type], m=>[m.startUpper_to_lower]) as MapNodeType : MapNodeType.category,
		accessPolicy: GetSystemAccessPolicyID("Public, ungoverned (standard)"),
		argumentType: ModifyString(FS_ArgumentType[data.current.argumentType ?? FS_ArgumentType.All], m=>[m.startUpper_to_lower]) as ArgumentType,
		c_currentRevision: data.currentRevision,
		createdAt: data.createdAt,
		creator: systemUserID,
		multiPremiseArgument: data.multiPremiseArgument,
		rootNodeForMap: undefined,
	});
	const link = new NodeChildLink({
		createdAt: node.createdAt,
		creator: systemUserID,
		form: data.link.form ? ModifyString(FS_ClaimForm[data.link.form], m=>[m.startUpper_to_lower]) as ClaimForm : null,
		polarity: data.link.polarity ? ModifyString(FS_Polarity[data.link.polarity], m=>[m.startUpper_to_lower]) as Polarity : null,
		seriesAnchor: data.link.seriesAnchor,
		//group: undefined, // this is filled in at paste-time
	});
	const revData = data.current;
	const revision = new MapNodeRevision({
		id: data.currentRevision,
		createdAt: revData.createdAt,
		creator: systemUserID,
		displayDetails: undefined,
		equation: revData.equation,
		media: revData.media == null ? undefined : new MediaAttachment({
			captured: revData.media.captured,
			id: revData.media.id,
			previewWidth: revData.media.previewWidth,
			sourceChains: GetSourceChainsFromFSSourceChains(revData.media.sourceChains),
		}),
		quote: revData.quote == null ? undefined : new QuoteAttachment({
			content: revData.quote.content,
			sourceChains: GetSourceChainsFromFSSourceChains(revData.quote.sourceChains),
		}),
		references: revData.references == null ? undefined : new ReferencesAttachment({
			sourceChains: GetSourceChainsFromFSSourceChains(revData.references.sourceChains),
		}),
		node: node.id,
		note: revData.note,
		phrasing: CullMapNodePhrasingToBeEmbedded(new MapNodePhrasing({
			id: GenerateUUID(),
			type: MapNodePhrasingType.standard,
			createdAt: revData.createdAt,
			creator: systemUserID,
			node: node.id,
			note: revData.note,
			text_base: revData.titles.base ?? "",
			text_negation: revData.titles.negation,
			text_question: revData.titles.yesNoQuestion,
		})),
	});
	result.push(new IR_NodeAndRevision({path, link, node, revision}));

	let i = 0;
	for (const [childID, childData] of Object.entries(data.childrenData ?? {})) {
		const childResources = GetResourcesInImportSubtree(childData, childID, path.concat(i));
		result.push(...childResources);
		i++;
	}

	return result;
});

function GetSourceChainsFromFSSourceChains(data: FS_SourceChain[]) {
	return data.map(sourceChainData=>{
		return new SourceChain(sourceChainData.sources.map(sourceData=>{
			return new Source({
				author: sourceData.author,
				link: sourceData.link,
				location: sourceData.location,
				name: sourceData.name,
				time_max: sourceData.time_max,
				time_min: sourceData.time_min,
				type: ModifyString(FS_SourceType[sourceData.type], m=>[m.startUpper_to_lower]) as SourceType,
			});
		}));
	});
}