import {ArgumentType, ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, GetSystemAccessPolicyID, NodeL1, NodePhrasing, NodePhrasingType, NodeRevision, NodeType, NodeType_Info, MediaAttachment, NodeChildLink, Polarity, QuoteAttachment, ReferencesAttachment, Source, SourceChain, SourceType, systemUserID} from "dm_common";
import {ModifyString} from "js-vextensions";
import {Command, CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat.js";
import {FS_SourceChain, FS_SourceType} from "./FSDataModel/FS_Attachments.js";
import {FS_NodeL3, FS_NodeType, FS_ClaimForm, FS_Polarity} from "./FSDataModel/FS_Node.js";
import {FS_ArgumentType} from "./FSDataModel/FS_NodeRevision.js";

type NodeL1_WithPath = NodeL1 & {path: number[]};
export const GetResourcesInImportSubtree = CreateAccessor((data: FS_NodeL3, id?: string, path: number[] = [])=>{
	const result = [] as ImportResource[];

	const node = new NodeL1({
		id: id ?? GenerateUUID(),
		type: data.type ? ModifyString(FS_NodeType[data.type], m=>[m.startUpper_to_lower]) as NodeType : NodeType.category,
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
	const revision = new NodeRevision({
		id: data.currentRevision,
		createdAt: revData.createdAt,
		creator: systemUserID,
		displayDetails: undefined,
		attachments: [
			revData.equation && {equation: revData.equation},
			revData.media && {media: new MediaAttachment({
				captured: revData.media.captured,
				id: revData.media.id,
				previewWidth: revData.media.previewWidth,
				sourceChains: GetSourceChainsFromFSSourceChains(revData.media.sourceChains),
			})},
			revData.quote && {quote: new QuoteAttachment({
				content: revData.quote.content,
				sourceChains: GetSourceChainsFromFSSourceChains(revData.quote.sourceChains),
			})},
			revData.references && {references: new ReferencesAttachment({
				sourceChains: GetSourceChainsFromFSSourceChains(revData.references.sourceChains),
			})},
		].filter(a=>a),
		node: node.id,
		note: revData.note,
		phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
			id: GenerateUUID(),
			type: NodePhrasingType.standard,
			createdAt: revData.createdAt,
			creator: systemUserID,
			node: node.id,
			note: revData.note,
			text_base: revData.titles.base ?? "",
			text_negation: revData.titles.negation,
			text_question: revData.titles.yesNoQuestion,
		})),
	});
	result.push(new IR_NodeAndRevision({pathInData: path, link, node, revision}));

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