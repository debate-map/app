import {GetNodeParentsAsync} from "../../Store/firebase/nodes";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {IsArgumentNode} from "../../Store/firebase/nodes/$node";
import {Map} from "../../Store/firebase/maps/@Map";
import DeleteNode from "Server/Commands/DeleteNode";
import {UserEdit} from "Server/CommandMacros";
import {Subforum} from "../../Store/firebase/forum/@Subforum";

@UserEdit
export default class DeleteSubforum extends Command<{subforumID: number}> {
	//oldData: Subforum;
	async Prepare() {
		/*let {subforumID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "forum", "subforums", subforumID) as Subforum;*/
	}
	async Validate() {}

	GetDBUpdates() {
		let {subforumID} = this.payload;
		let updates = {};
		updates[`forum/subforums/${subforumID}`] = null;
		return updates;
	}
}