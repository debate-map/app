var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { Command } from "mobx-firelink";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
let AddLayer = class AddLayer extends Command {
    Validate() {
        var _a;
        const { layer } = this.payload;
        this.layerID = (_a = this.layerID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        layer.createdAt = Date.now();
        AssertValidate("Layer", layer, "Layer invalid");
    }
    GetDBUpdates() {
        const { layer } = this.payload;
        const updates = {
            // 'general/data/.lastLayerID': this.layerID,
            [`layers/${this.layerID}`]: layer,
        };
        return updates;
    }
};
AddLayer = __decorate([
    UserEdit
], AddLayer);
export { AddLayer };
