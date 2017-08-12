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
import {ForDeleteLayer_GetError, GetLayer} from "../../Store/firebase/layers";
import {GetAsync} from "Frame/Database/DatabaseHelpers";
import {Layer} from "../../Store/firebase/layers/@Layer";
import {UserMapInfoSet} from "../../Store/firebase/userMapInfo/@UserMapInfo";

@UserEdit
export default class DeleteLayer extends Command<{layerID: number}> {
	oldData: Layer;
	userMapInfoSets: {[key: string]: UserMapInfoSet};
	async Prepare() {
		let {layerID} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "layers", layerID) as Layer;
		this.userMapInfoSets = await GetDataAsync("userMapInfo") as {[key: string]: UserMapInfoSet};
	}
	async Validate() {
		let {layerID} = this.payload;
		let earlyError = await GetAsync(()=>ForDeleteLayer_GetError(this.userInfo.id, this.oldData));
		Assert(earlyError == null, earlyError);
	}

	GetDBUpdates() {
		let {layerID} = this.payload;
		let updates = {};
		updates[`layers/${layerID}`] = null;
		for (let mapID in (this.oldData.mapsWhereEnabled || {})) {
			updates[`maps/${mapID}/layers/${layerID}`] = null;
		}
		for (let {name: userID, value: userMapInfoSet} of this.userMapInfoSets.Props(true)) {
			for (let {name: mapID2, value: userMapInfo} of userMapInfoSet.Props(true)) {
				if (userMapInfo.layerStates[layerID] != null) {
					updates[`userMapInfo/${userID}/${mapID2}/layerStates/${layerID}`] = null;
				}
			}
		}
		return updates;
	}
}