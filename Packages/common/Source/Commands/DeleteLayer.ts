import {AssertV, AV, Command, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {UserEdit} from "../CommandMacros";
import {Layer} from "../Store/db/layers/@Layer";
import {UserMapInfoSet} from "../Store/db/userMapInfo/@UserMapInfo";
import {GetLayer, ForDeleteLayer_GetError} from "../Store/db/layers";
import {IsUserCreatorOrMod} from "../Commands";
import {AssertUserCanDelete, AssertUserCanModify} from "./Helpers/SharedAsserts";

@UserEdit
export class DeleteLayer extends Command<{layerID: string}, {}> {
	oldData: Layer;
	userMapInfoSets: UserMapInfoSet[];
	Validate() {
		const {layerID} = this.payload;
		// this.oldData = await GetDoc_Async({}, (a) => a.layers.get(layerID));
		this.oldData = AV.NonNull = GetLayer(layerID);
		AssertUserCanDelete(this, this.oldData);
		this.userMapInfoSets = AV.NonNull = GetDocs({resultForLoading: undefined}, a=>a.userMapInfo);

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