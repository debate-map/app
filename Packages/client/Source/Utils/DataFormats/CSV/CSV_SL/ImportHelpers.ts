import {MapNode, MapNodeType, GetSystemAccessPolicyID, ArgumentType, systemUserID, NodeChildLink, ClaimForm, Polarity, MapNodeRevision, MediaAttachment, QuoteAttachment, ReferencesAttachment, CullMapNodePhrasingToBeEmbedded, MapNodePhrasing, MapNodePhrasingType, SourceChain, Source, SourceType, ChildGroup} from "dm_common";
import {ModifyString} from "js-vextensions";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {Assert} from "react-vextensions/Dist/Internals/FromJSVE";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat";
import {FS_SourceChain, FS_SourceType} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_Attachments";
import {FS_MapNodeL3, FS_MapNodeType, FS_ClaimForm, FS_Polarity} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_MapNode";
import {FS_ArgumentType} from "Utils/DataFormats/JSON/DM_Old/FSDataModel/FS_MapNodeRevision";
import {CSV_SL_Row} from "./DataModel.js";

export const GetResourcesInImportSubtree_CSV_SL = CreateAccessor((rows: CSV_SL_Row[])=>{
	const result = [] as ImportResource[];

	for (const row of rows) {
		if (row.title.trim().length == 0) continue;
		result.push(GetResourceForRow(row));
	}

	return result;
});

const accessPolicyID = "O0v-8gPfRoq8_enYa4QSuA";
export const GetResourceForRow = CreateAccessor((row: CSV_SL_Row)=>{
	const node = new MapNode({
		id: GenerateUUID(),
		type: MapNodeType.claim,
		accessPolicy: accessPolicyID,
		createdAt: Date.now(),
		creator: systemUserID,
	});
	const link = new NodeChildLink({
		createdAt: node.createdAt,
		creator: systemUserID,
		form: ClaimForm.base,
		//polarity: row.Orientation.trim().toLowerCase() == "Con" ? Polarity.opposing : Polarity.supporting,
		group: ChildGroup.generic,
	});
	const revision = new MapNodeRevision({
		id: GenerateUUID(),
		createdAt: node.createdAt,
		creator: systemUserID,
		references: row.link.trim().length == 0 ? undefined : new ReferencesAttachment({
			sourceChains: [
				new SourceChain([
					new Source({
						type: SourceType.webpage,
						link: row.link.trim(),
					}),
				]),
			],
		}),
		node: node.id,
		//note: undefined, // note cells added to phrasing.note instead (since we don't necessarily want the info showing in TitlePanel)
		phrasing: CullMapNodePhrasingToBeEmbedded(new MapNodePhrasing({
			text_base: row.title,
			note: [row.note1.trim(), row.note2.trim(), row.note3.trim()].filter(a=>a).join(" | "),
		})),
	});

	const proVSConStr =
		row.orientation.toLowerCase() == "pro" ? "Pro" :
		row.orientation.toLowerCase() == "con" ? "Con" :
		"(missing orientation)";
	return new IR_NodeAndRevision({
		pathInData: [],
		link, node, revision,
		insertPath: [
			row.position,
			row.topic,
			row.subtopic,
			proVSConStr,
		],
	});
});