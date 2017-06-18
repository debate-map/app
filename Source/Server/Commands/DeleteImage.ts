import {Image} from "../../Store/firebase/images/@Image";
import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {Term} from "../../Store/firebase/terms/@Term";

export default class DeleteImage extends Command<{id: number}> {
	oldData: Image;
	async Prepare() {
		let {id} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "images", id) as Image;
	}
	async Validate() {
	}
	
	GetDBUpdates() {
		let {id} = this.payload;
		let updates = {
			[`images/${id}`]: null,
		};
		return updates;
	}
}