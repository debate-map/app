import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {Map} from "../../Store/firebase/maps/@Map";
import AddNode from "./AddNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class AddMap extends Command<{map: Map}> {
	lastMapID_new: number;
	mapID: number;
	sub_addNode: AddNode;
	async Prepare() {
		let {map} = this.payload;

		this.lastMapID_new = await GetDataAsync(`general/lastMapID`) as number;
		this.mapID = ++this.lastMapID_new;

		let newRootNode = new MapNode({type: MapNodeType.Category, creator: map.creator, titles: {base: "Root"}})
		this.sub_addNode = new AddNode({node: newRootNode, asMapRoot: true});
		this.sub_addNode.Validate_Early();
		await this.sub_addNode.Prepare();

		this.payload.map.rootNode = this.sub_addNode.nodeID;
	}
	async Validate() {
		let {map} = this.payload;
		AssertValidate("Map", map, `Map invalid`);
		this.sub_addNode.Validate();
	}
	
	GetDBUpdates() {
		let {map} = this.payload;
		let updates = {
			"general/lastMapID": this.lastMapID_new,
			[`maps/${this.mapID}`]: map,
		} as any;
		updates = MergeDBUpdates(updates, this.sub_addNode.GetDBUpdates());
		return updates;
	}
}