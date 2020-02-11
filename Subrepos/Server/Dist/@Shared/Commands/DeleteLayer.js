var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AssertV, AV, Command, GetDocs } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { GetLayer, ForDeleteLayer_GetError } from "../Store/firebase/layers";
let DeleteLayer = class DeleteLayer extends Command {
    Validate() {
        const { layerID } = this.payload;
        // this.oldData = await GetDoc_Async({}, (a) => a.layers.get(layerID));
        this.oldData = AV.NonNull = GetLayer(layerID);
        this.userMapInfoSets = AV.NonNull = GetDocs({ resultForLoading: undefined }, a => a.userMapInfo);
        const earlyError = ForDeleteLayer_GetError(this.userInfo.id, this.oldData);
        AssertV(earlyError == null, earlyError);
    }
    GetDBUpdates() {
        const { layerID } = this.payload;
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
};
DeleteLayer = __decorate([
    UserEdit
], DeleteLayer);
export { DeleteLayer };
