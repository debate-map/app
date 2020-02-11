import {Command_Old, MergeDBUpdates, Command, AssertV} from "mobx-firelink";
import {AssertValidate, UUID, GenerateUUID} from "mobx-firelink";
import {OmitIfFalsy, Assert} from "js-vextensions";
import {UserEdit} from "../CommandMacros";
import {AddChildNode} from "./AddChildNode";
import {Map} from "../Store/firebase/maps/@Map";
import {MapNode} from "../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../Store/firebase/nodes/@MapNodeType";
import {MapType} from "../Store/firebase/maps/@Map";
import {MapNodeRevision} from "../Store/firebase/nodes/@MapNodeRevision";

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

		const newRootNode = new MapNode({type: MapNodeType.Category, creator: map.creator, rootNodeForMap: this.mapID, ownerMapID: OmitIfFalsy(map.type == MapType.Private && this.mapID)});
		const newRootNodeRevision = new MapNodeRevision({titles: {base: "Root"}, votingDisabled: true});
		this.sub_addNode = this.sub_addNode ?? new AddChildNode({mapID: this.mapID, parentID: null, node: newRootNode, revision: newRootNodeRevision, asMapRoot: true}).MarkAsSubcommand(this);
		this.sub_addNode.Validate();

		map.rootNode = this.sub_addNode.sub_addNode.nodeID;
		AssertValidate("Map", map, "Map invalid");

		this.returnData = this.mapID;
	}

	GetDBUpdates() {
		const {map} = this.payload;

		let updates = {};
		updates["general/data/.lastMapID"] = this.mapID;
		updates[`maps/${this.mapID}`] = map;
		updates = MergeDBUpdates(updates, this.sub_addNode.GetDBUpdates());
		return updates;
	}
}