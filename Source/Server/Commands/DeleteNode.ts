import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";

export default class DeleteNode extends Command<{nodeID: number}> {
	oldData: MapNode;
	//oldParentID__childrenOrder: {};
	oldParentChildrenOrders: number[][];
	metaThesisID: number;
	async Prepare() {
		let {nodeID} = this.payload;
		this.oldData = await GetDataAsync(`nodes/${nodeID}`, true, false) as MapNode;

		/*let parentIDs = this.oldData.parents.VKeys();
		let oldParentChildrenOrders = await Promise.all(parentIDs.map(parentID=> {
			return GetDataAsync(`nodes/${parentID}/childrenOrder`) as Promise<number[]>;
		}));
		this.oldParentID__childrenOrder = oldParentChildrenOrders.reduce((result, current, index)=>result.VSet(parentIDs[index], current), {});*/
		this.oldParentChildrenOrders = await Promise.all(this.oldData.parents.VKeys().map(parentID=> {
			return GetDataAsync(`nodes/${parentID}/childrenOrder`) as Promise<number[]>;
		}));

		this.metaThesisID = IsArgumentNode(this.oldData) ? this.oldData.children.VKeys()[0].ToInt() : null;
	}
	async Validate() {
		Assert(this.oldData.parents.VKeys(true).length == 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");
	}

	GetDBUpdates() {
		let {nodeID} = this.payload;
		let updates = {};

		// delete node's own data
		updates[`nodes/${nodeID}`] = null;
		updates[`nodeExtras/${nodeID}`] = null;
		updates[`nodeRatings/${nodeID}`] = null;

		// delete links with parents
		for (let {index, name: parentID} of this.oldData.parents.Props()) {
			updates[`nodes/${parentID}/children/${nodeID}`] = null;
			//let parent_childrenOrder = this.oldParentID__childrenOrder[parentID];
			let parent_childrenOrder = this.oldParentChildrenOrders[index];
			if (parent_childrenOrder) {
				updates[`nodes/${parentID}/childrenOrder`] = parent_childrenOrder.Except(nodeID);
			}
		}

		// if has meta-thesis, delete it also
		if (this.metaThesisID) {
			updates[`nodes/${this.metaThesisID}`] = null;
			updates[`nodeExtras/${this.metaThesisID}`] = null;
			updates[`nodeRatings/${this.metaThesisID}`] = null;
		}

		return updates;
	}
}