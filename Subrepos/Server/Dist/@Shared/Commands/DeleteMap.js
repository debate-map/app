var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { UserEdit } from "../CommandMacros";
import { MergeDBUpdates, GetDocs, AssertV, Command } from "mobx-firelink";
import { DeleteNode } from "./DeleteNode";
import { GetMap } from "../Store/firebase/maps";
import { CE } from "js-vextensions";
let DeleteMap = class DeleteMap extends Command {
    Validate() {
        var _a;
        const { mapID } = this.payload;
        this.oldData = GetMap(mapID);
        AssertV(this.oldData, "oldData is null.");
        this.userMapInfoSets = GetDocs({}, a => a.userMapInfo) || [];
        this.sub_deleteNode = (_a = this.sub_deleteNode, (_a !== null && _a !== void 0 ? _a : new DeleteNode({ mapID, nodeID: this.oldData.rootNode }).MarkAsSubcommand(this)));
        this.sub_deleteNode.asPartOfMapDelete = true;
        this.sub_deleteNode.Validate();
        // todo: use parents recursion on l2 nodes to make sure they're all connected to at least one other map root
    }
    GetDBUpdates() {
        const { mapID } = this.payload;
        let updates = this.sub_deleteNode.GetDBUpdates();
        const newUpdates = {};
        newUpdates[`maps/${mapID}`] = null;
        for (const userMapInfoSet of this.userMapInfoSets) {
            const userID = userMapInfoSet._key;
            for (const { key: mapID2, value: userMapInfo } of CE(userMapInfoSet.maps).Pairs()) {
                if (mapID2 == mapID) {
                    newUpdates[`userMapInfo/${userID}/.${mapID}`] = null;
                }
            }
        }
        // delete entry in mapNodeEditTimes
        newUpdates[`mapNodeEditTimes/${mapID}`] = null;
        updates = MergeDBUpdates(updates, newUpdates);
        return updates;
    }
};
DeleteMap = __decorate([
    UserEdit
], DeleteMap);
export { DeleteMap };
