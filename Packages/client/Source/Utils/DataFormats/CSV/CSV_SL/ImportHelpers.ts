import {ChildGroup, ClaimForm, CullNodePhrasingToBeEmbedded, NodeLink, NodeL1, NodePhrasing, NodeRevision, NodeType, ReferencesAttachment, Source, SourceChain, SourceType, systemUserID} from "dm_common";
import {CreateAccessor, GenerateUUID} from "mobx-graphlink";
import {ImportResource, IR_NodeAndRevision} from "Utils/DataFormats/DataExchangeFormat";
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
	const node = new NodeL1({
		id: GenerateUUID(),
		type: NodeType.claim,
		accessPolicy: accessPolicyID,
		createdAt: Date.now(),
		creator: systemUserID,
	});
	const link = new NodeLink({
		createdAt: node.createdAt,
		creator: systemUserID,
		form: ClaimForm.base,
		//polarity: row.Orientation.trim().toLowerCase() == "Con" ? Polarity.opposing : Polarity.supporting,
		group: ChildGroup.generic,
	});
	const revision = new NodeRevision({
		id: GenerateUUID(),
		createdAt: node.createdAt,
		creator: systemUserID,
		attachments: [
			{
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
			},
		],
		node: node.id,
		//note: undefined, // note cells added to phrasing.note instead (since we don't necessarily want the info showing in TitlePanel)
		phrasing: CullNodePhrasingToBeEmbedded(new NodePhrasing({
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
		insertPath_titles: [
			row.position,
			row.topic,
			row.subtopic,
			proVSConStr,
		],
	});
});