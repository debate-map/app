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
AddSchema("SetMapLayerStateForUser_payload", {
    properties: {
        userID: { type: "string" },
        mapID: { type: "string" },
        layerID: { type: "string" },
        state: { type: ["null", "boolean"] },
    },
    required: ["userID", "mapID", "layerID", "state"],
});
let SetMapLayerStateForUser = class SetMapLayerStateForUser extends Command {
    Validate() {
        AssertValidate("SetMapLayerStateForUser_payload", this.payload, "Payload invalid");
        const { userID } = this.payload;
        AssertV(userID == this.userInfo.id, "Cannot change this setting for another user!");
    }
    GetDBUpdates() {
        const { userID, mapID, layerID, state } = this.payload;
        const updates = {};
        updates[`userMapInfo/${userID}/.${mapID}/.layerStates/.${layerID}`] = state;
        // updates[`layers/${layerID}/usersWhereStateSet/${userID}`] = state;
        return updates;
    }
};
SetMapLayerStateForUser = __decorate([
    MapEdit,
    UserEdit
], SetMapLayerStateForUser);
export { SetMapLayerStateForUser };
