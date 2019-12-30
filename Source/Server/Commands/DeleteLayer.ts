import {UserEdit} from "Server/CommandMacros";
import {Assert} from "js-vextensions";
import {Command_Old, GetAsync, GetDocs, GetDoc, Command, AssertV} from "mobx-firelink";
import {ObservableMap} from "mobx";
import {ForDeleteLayer_GetError, GetLayer} from "../../Store/firebase/layers";
import {Layer} from "../../Store/firebase/layers/@Layer";
import {UserMapInfoSet} from "../../Store/firebase/userMapInfo/@UserMapInfo";

@UserEdit
export class DeleteLayer extends Command<{layerID: string}, {}> {
	oldData: Layer;
	userMapInfoSets: UserMapInfoSet[];
	Validate() {
		const {layerID} = this.payload;
		// this.oldData = await GetDoc_Async({}, (a) => a.layers.get(layerID));
		this.oldData = GetLayer(layerID);
		AssertV(this.oldData, "oldData is null.");
		this.userMapInfoSets = GetDocs({undefinedForLoading: true}, a=>a.userMapInfo);
		AssertV(this.userMapInfoSets, "userMapInfoSets is null.");

		const earlyError = ForDeleteLayer_GetError(this.userInfo.id, this.oldData);
		AssertV(earlyError == null, earlyError);
	}

	GetDBUpdates() {
		const {layerID} = this.payload;
		const updates = {};
		updates[`layers/${layerID}`] = null;
		for (const mapID of this.oldData.mapsWhereEnabled.keys()) {
			updates[`maps/${mapID}/.layers/.${layerID}`] = null;
		}
		for (const userMapInfoSet of this.userMapInfoSets) {
			const userID = userMapInfoSet._key;
			for (const [mapID2, userMapInfo] of userMapInfoSet.maps.entries()) {
				if (userMapInfo.layerStates[layerID] != null) {
					updates[`userMapInfo/${userID}/.${mapID2}/.layerStates/.${layerID}`] = null;
				}
			}
		}
		return updates;
	}
}