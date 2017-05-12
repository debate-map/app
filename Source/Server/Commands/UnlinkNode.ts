import {ForUnlink_GetError, GetNodeAsync, GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class UnlinkNode extends Command<{parentID: number, childID: number}> {
	async Run() {
		let {parentID, childID} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		/*let error = ForUnlink_GetError(userID, node);
		if (error) {
			throw new Error("Cannot unlink: " + error);
		}*/

		let childNode = await GetNodeAsync(childID);
		let parentNodes = await GetNodeParentsAsync(childNode);
		if (parentNodes.length <= 1) throw new Error("Cannot unlink this child, as doing so would orphan it. Try deleting it instead.");
		
		// prepare
		// ==========

		// validate state
		// ==========

		// execute
		// ==========

		let dbUpdates = {};
		dbUpdates[`nodes/${childID}/parents/${parentID}`] = null;
		dbUpdates[`nodes/${parentID}/children/${childID}`] = null;
		let parent_oldChildrenOrder = await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
		if (parent_oldChildrenOrder) {
			dbUpdates[`nodes/${parentID}/childrenOrder`] = parent_oldChildrenOrder.Except(childID);
		}
		await firebase.Ref().update(dbUpdates);
	}
}