import {E} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema, UUID} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetDefaultAccessPolicyID_ForNode} from "../DB/accessPolicies.js";
import {Map} from "../DB/maps/@Map.js";
import {MapNodePhrasing} from "../DB/nodePhrasings/@MapNodePhrasing.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {AddChildNode} from "./AddChildNode.js";
import {AddNode} from "./AddNode.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$map: {$ref: "Map"},
	}),
	returnSchema: ()=>SimpleSchema({$id: {$ref: "UUID"}}),
})
export class AddMap extends Command<{map: Map}, {id: UUID}> {
	sub_addNode: AddNode;
	Validate() {
		const {map} = this.payload;
		AssertV(map.featured === undefined, 'Cannot set "featured" to true while first adding a map. (hmmm)');

		map.id = this.GenerateUUID_Once("id");
		map.creator = this.userInfo.id;
		map.createdAt = Date.now();
		map.edits = 0;
		map.editedAt = map.createdAt;

		const newRootNode = new MapNode({
			//ownerMapID: OmitIfFalsy(map.type == MapType.Private && this.mapID),
			accessPolicy: GetDefaultAccessPolicyID_ForNode(),
			type: MapNodeType.category, creator: map.creator, rootNodeForMap: map.id,
		});
		const newRootNodeRevision = new MapNodeRevision(E(map.nodeDefaults, {phrasing: MapNodePhrasing.Embedded({text_base: "Root"})}));
		this.sub_addNode = this.sub_addNode ?? new AddNode({mapID: map.id, node: newRootNode, revision: newRootNodeRevision}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		map.rootNode = this.sub_addNode.payload.node.id;
		AssertValidate("Map", map, "Map invalid");

		this.returnData = {id: map.id};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {map} = this.payload;
		db.set(dbp`maps/${map.id}`, map);
		db.add(this.sub_addNode.GetDBUpdates()); // add node first, since map has fk-ref to it
	}
}