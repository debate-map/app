var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MergeDBUpdates, Command, AssertV } from "mobx-firelink";
import { AssertValidate, GenerateUUID } from "mobx-firelink";
import { OmitIfFalsy } from "js-vextensions";
import { UserEdit } from "../CommandMacros";
import { AddChildNode } from "./AddChildNode";
import { MapNode } from "../Store/firebase/nodes/@MapNode";
import { MapNodeType } from "../Store/firebase/nodes/@MapNodeType";
import { MapType } from "../Store/firebase/maps/@Map";
import { MapNodeRevision } from "../Store/firebase/nodes/@MapNodeRevision";
let AddMap = class AddMap extends Command {
    Validate() {
        var _a, _b;
        const { map } = this.payload;
        AssertV(map.featured === undefined, 'Cannot set "featured" to true while first adding a map. (hmmm)');
        this.mapID = (_a = this.mapID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        map.createdAt = Date.now();
        map.editedAt = map.createdAt;
        const newRootNode = new MapNode({ type: MapNodeType.Category, creator: map.creator, rootNodeForMap: this.mapID, ownerMapID: OmitIfFalsy(map.type == MapType.Private && this.mapID) });
        const newRootNodeRevision = new MapNodeRevision({ titles: { base: "Root" }, votingDisabled: true });
        this.sub_addNode = (_b = this.sub_addNode, (_b !== null && _b !== void 0 ? _b : new AddChildNode({ mapID: this.mapID, parentID: null, node: newRootNode, revision: newRootNodeRevision, asMapRoot: true }).MarkAsSubcommand(this)));
        this.sub_addNode.Validate();
        map.rootNode = this.sub_addNode.sub_addNode.nodeID;
        AssertValidate("Map", map, "Map invalid");
        this.returnData = this.mapID;
    }
    GetDBUpdates() {
        const { map } = this.payload;
        let updates = {};
        updates["general/data/.lastMapID"] = this.mapID;
        updates[`maps/${this.mapID}`] = map;
        updates = MergeDBUpdates(updates, this.sub_addNode.GetDBUpdates());
        return updates;
    }
};
AddMap = __decorate([
    UserEdit
], AddMap);
export { AddMap };
