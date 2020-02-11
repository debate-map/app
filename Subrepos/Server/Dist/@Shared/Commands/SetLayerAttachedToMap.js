var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MapEdit } from "../CommandMacros";
import { AddSchema, AssertValidate } from "mobx-firelink";
import { Command, AssertV } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { GetMap } from "../Store/firebase/maps";
AddSchema("SetLayerAttachedToMap_payload", {
    properties: {
        mapID: { type: "string" },
        layerID: { type: "string" },
        attached: { type: "boolean" },
    },
    required: ["mapID", "layerID", "attached"],
});
let SetLayerAttachedToMap = class SetLayerAttachedToMap extends Command {
    Validate_Early() {
        AssertValidate("SetLayerAttachedToMap_payload", this.payload, "Payload invalid");
    }
    Validate() {
        const { mapID } = this.payload;
        this.oldData = GetMap(mapID);
        AssertV(this.oldData, "Map does not exist!");
    }
    GetDBUpdates() {
        const { mapID, layerID, attached } = this.payload;
        const updates = {};
        updates[`maps/${mapID}/.layers/.${layerID}`] = attached || null;
        updates[`layers/${layerID}/.mapsWhereEnabled/.${mapID}`] = attached || null;
        return updates;
    }
};
SetLayerAttachedToMap = __decorate([
    MapEdit,
    UserEdit
], SetLayerAttachedToMap);
export { SetLayerAttachedToMap };
