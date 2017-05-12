import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class DeleteNode extends Command<{nodeID: number}> {
	async Run() {
		let {nodeID} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		let oldData = await GetDataAsync(`nodes/${nodeID}`, true, false) as MapNode;
		Assert(oldData.parents.VKeys(true).length == 1, "Cannot delete this child, as it has more than one parent. Try unlinking it instead.");

		// prepare
		// ==========

		let metaThesisID = oldData.type == MapNodeType.SupportingArgument || oldData.type == MapNodeType.OpposingArgument ? oldData.children.VKeys()[0] : null;

		// validate state
		// ==========

		// execute
		// ==========

		let dbUpdates = {};
		// delete node's own data
		dbUpdates[`nodes/${nodeID}`] = null;
		dbUpdates[`nodeExtras/${nodeID}`] = null;
		dbUpdates[`nodeRatings/${nodeID}`] = null;
		// delete links with parents
		for (let parentID in oldData.parents) {
			dbUpdates[`nodes/${parentID}/children/${nodeID}`] = null;
			let parent_oldChildrenOrder = await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
			if (parent_oldChildrenOrder) {
				dbUpdates[`nodes/${parentID}/childrenOrder`] = parent_oldChildrenOrder.Except(nodeID);
			}
		}
		// if has meta-thesis, delete it also
		if (metaThesisID) {
			dbUpdates[`nodes/${metaThesisID}`] = null;
			dbUpdates[`nodeExtras/${metaThesisID}`] = null;
			dbUpdates[`nodeRatings/${metaThesisID}`] = null;
		}
		await firebase.Ref().update(dbUpdates);
	}
}