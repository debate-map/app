import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, MapNodeL3} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {GetNodeL3, ReversePolarity} from "../../Store/firebase/nodes/$node";
import {RatingsSet} from "../../Store/firebase/nodeRatings/@RatingsRoot";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetNodeL2} from "Store/firebase/nodes/$node";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {GetParentNodeID} from "../../Store/firebase/nodes";

AddSchema({
	properties: {
		mapID: {type: "number"},
		nodeID: {type: "number"},
		path: {type: "string"},
	},
	required: ["nodeID"],
}, "ReverseArgumentPolarity_payload");

@MapEdit
@UserEdit
export default class ReverseArgumentPolarity extends Command<{mapID?: number, nodeID: number, path: string}> {
	Validate_Early() {
		AssertValidate("ReverseArgumentPolarity_payload", this.payload, `Payload invalid`);
	}

	parentID: number;
	oldNodeData: MapNodeL3;
	newLinkData: ChildEntry;
	async Prepare() {
		let {nodeID, path} = this.payload;

		let oldNodeData = await GetAsync_Raw(()=>GetNodeL3(nodeID, path));
		this.parentID = GetParentNodeID(path);
		
		this.newLinkData = {...oldNodeData.link};
		this.newLinkData.polarity = ReversePolarity(this.newLinkData.polarity);
	}
	async Validate() {
		Assert(this.oldNodeData.type == MapNodeType.Argument, "Can only reverse polarity of an argument node.");
		AssertValidate("ChildEntry", this.newLinkData, `New link-data invalid`);
	}

	GetDBUpdates() {
		let {nodeID} = this.payload;

		let updates = {};
		updates[`nodes/${this.parentID}/children/${nodeID}`] = this.newLinkData;
		return updates;
	}
}