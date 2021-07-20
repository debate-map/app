import {E} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, SimpleSchema, UUID} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros.js";
import {GetDefaultAccessPolicyID_ForNode} from "../DB/accessPolicies.js";
import {Map} from "../DB/maps/@Map.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {AddChildNode} from "./AddChildNode.js";

@UserEdit
@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$map: {$ref: "Map"},
	}),
	returnSchema: ()=>SimpleSchema({$id: {$ref: "UUID"}}),
})
export class AddMap extends Command<{map: Map}, {id: UUID}> {
	mapID: string;
	sub_addNode: AddChildNode;
	Validate() {
		const {map} = this.payload;
		AssertV(map.featured === undefined, 'Cannot set "featured" to true while first adding a map. (hmmm)');

		this.mapID = this.mapID ?? GenerateUUID();
		map.createdAt = Date.now();
		map.editedAt = map.createdAt;

		const newRootNode = new MapNode({
			//ownerMapID: OmitIfFalsy(map.type == MapType.Private && this.mapID),
			accessPolicy: GetDefaultAccessPolicyID_ForNode(),
			type: MapNodeType.category, creator: map.creator, rootNodeForMap: this.mapID,
		});
		const newRootNodeRevision = new MapNodeRevision(E(map.nodeDefaults, {titles: {base: "Root"}, votingDisabled: true}));
		this.sub_addNode = this.sub_addNode ?? new AddChildNode({mapID: this.mapID, parentID: null as any, node: newRootNode, revision: newRootNodeRevision, asMapRoot: true}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		map.rootNode = this.sub_addNode.sub_addNode.nodeID;
		AssertValidate("Map", map, "Map invalid");

		this.returnData = {id: this.mapID};
	}

	DeclareDBUpdates(db: DBHelper) {
		const {map} = this.payload;
		db.set(dbp`maps/${this.mapID}`, map);
		db.add(this.sub_addNode.GetDBUpdates());
	}
}