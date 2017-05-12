import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";

export default class LinkNode extends Command<{parentID: number, childID: number, childForm: ThesisForm}> {
	async Run() {
		let {parentID, childID, childForm} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========
		
		// prepare
		// ==========

		// validate state
		// ==========

		// execute
		// ==========

		let dbUpdates = {};
		// add parent as parent-of-child
		dbUpdates[`nodes/${childID}/parents/${parentID}`] = {_: true};
		// add child as child-of-parent
		dbUpdates[`nodes/${parentID}/children/${childID}`] = E({_: true}, childForm && {form: childForm});
		let parent_oldChildrenOrder = await GetDataAsync(`nodes/${parentID}/childrenOrder`) as number[];
		if (parent_oldChildrenOrder) {
			dbUpdates[`nodes/${parentID}/childrenOrder`] = parent_oldChildrenOrder.concat([childID]);
		}
		await firebase.Ref().update(dbUpdates);
	}
}