import {Knex} from "knex";
import {MapNode, MapNodeRevision} from "dm_common";
import {GenerateUUID, LastUUID} from "web-vcore/nm/mobx-graphlink";
import {CE} from "web-vcore/nm/js-vextensions";

const nodes: (MapNode & {revision: MapNodeRevision})[] = [
	{
		id: GenerateUUID(),
		accessPolicy: null,
		createdAt: Date.now(),
		revision: {
			id: GenerateUUID(),
			node: LastUUID(-1),
			createdAt: Date.now(),
			titles: JSON.stringify({
				base: "Root",
			}) as any,
		},
	}
];

export default async function seed(knex: Knex.Transaction) {
	for (const [index, node] of nodes.entries()) {
		console.log(`Adding node ${index}.`);
		await knex("nodes").insert(CE(node).Excluding("revision"));
		console.log(`Adding node revision ${index}.`);
		await knex("nodeRevisions").insert(node.revision);
	}
	console.log(`Done adding nodes.`);
};