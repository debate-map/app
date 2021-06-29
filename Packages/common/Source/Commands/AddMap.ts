import {MergeDBUpdates, Command, AssertV} from "web-vcore/nm/mobx-graphlink.js";
import {AssertValidate, UUID, GenerateUUID} from "web-vcore/nm/mobx-graphlink.js";
import {OmitIfFalsy, Assert, E} from "web-vcore/nm/js-vextensions.js";
import {UserEdit} from "../CommandMacros.js";
import {AddChildNode} from "./AddChildNode.js";
import {Map} from "../Store/db/maps/@Map.js";
import {MapNode} from "../Store/db/nodes/@MapNode.js";
import {MapNodeType} from "../Store/db/nodes/@MapNodeType.js";
import {MapType} from "../Store/db/maps/@Map.js";
import {MapNodeRevision} from "../Store/db/nodes/@MapNodeRevision.js";
import {GetDefaultAccessPolicyID_ForNode} from "../Store/db/accessPolicies.js";

@UserEdit
export class AddMap extends Command<{map: Map}, UUID> {
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
		this.sub_addNode = this.sub_addNode ?? new AddChildNode({mapID: this.mapID, parentID: null, node: newRootNode, revision: newRootNodeRevision, asMapRoot: true}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		map.rootNode = this.sub_addNode.sub_addNode.nodeID;
		AssertValidate("Map", map, "Map invalid");

		this.returnData = this.mapID;
	}

	GetDBUpdates() {
		const {map} = this.payload;

		let updates = {};
		updates[`maps/${this.mapID}`] = map;
		updates = MergeDBUpdates(updates, this.sub_addNode.GetDBUpdates());
		return updates;
	}
}