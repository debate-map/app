import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {Map} from "../../Store/firebase/maps/@Map";
import AddNode from "./AddNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {UserEdit} from "Server/CommandMacros";

@UserEdit
export default class AddMap extends Command<{map: Map}> {
	mapID: number;
	sub_addNode: AddNode;
	async Prepare() {
		let {map} = this.payload;

		let lastMapID = await GetDataAsync("general", "lastMapID") as number;
		this.mapID = lastMapID + 1;
		map.createdAt = Date.now();
		map.editedAt = map.createdAt;

		let newRootNode = new MapNode({type: MapNodeType.Category, creator: map.creator, titles: {base: "Root"}, votingDisabled: true})
		this.sub_addNode = new AddNode({mapID: this.mapID, node: newRootNode, asMapRoot: true});
		this.sub_addNode.Validate_Early();
		await this.sub_addNode.Prepare();

		map.rootNode = this.sub_addNode.nodeID;
	}
	async Validate() {
		let {map} = this.payload;
		AssertValidate("Map", map, `Map invalid`);
		await this.sub_addNode.Validate();
	}
	
	GetDBUpdates() {
		let {map} = this.payload;
		let updates = {
			"general/lastMapID": this.mapID,
			[`maps/${this.mapID}`]: map,
		} as any;
		updates = MergeDBUpdates(updates, this.sub_addNode.GetDBUpdates());
		return updates;
	}
}