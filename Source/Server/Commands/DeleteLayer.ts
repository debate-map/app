import { GetAsync } from "Frame/Database/DatabaseHelpers";
import { UserEdit } from "Server/CommandMacros";
import { Assert } from "js-vextensions";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { ForDeleteLayer_GetError } from "../../Store/firebase/layers";
import { Layer } from "../../Store/firebase/layers/@Layer";
import { UserMapInfoSet } from "../../Store/firebase/userMapInfo/@UserMapInfo";
import { Command } from "../Command";

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