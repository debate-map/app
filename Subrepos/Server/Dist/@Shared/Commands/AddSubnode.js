var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { AssertV, Command, MergeDBUpdates } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { AddNode } from "./AddNode";
import { GetLayer } from "../Store/firebase/layers";
let AddSubnode = class AddSubnode extends Command {
    Validate() {
        var _a;
        const { mapID, layerID, anchorNodeID, subnode, subnodeRevision } = this.payload;
        this.sub_addNode = (_a = this.sub_addNode, (_a !== null && _a !== void 0 ? _a : new AddNode({ mapID, node: subnode, revision: subnodeRevision }).MarkAsSubcommand(this)));
        this.sub_addNode.Validate();
        this.layer_oldData = GetLayer(layerID);
        AssertV(this.layer_oldData, "layer_oldData is null.");
        this.returnData = this.sub_addNode.nodeID;
        this.sub_addNode.Validate();
    }
    GetDBUpdates() {
        const { layerID, anchorNodeID, subnode } = this.payload;
        const updates = this.sub_addNode.GetDBUpdates();
        const newUpdates = {};
        // add into layer
        newUpdates[`layers/${layerID}/.nodeSubnodes/.${anchorNodeID}/.${this.sub_addNode.nodeID}`] = true;
        const layerPlusAnchorStr = `${layerID}+${anchorNodeID}`;
        newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerPlusAnchorParents/.${layerPlusAnchorStr}`] = true;
        /* newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerOwner`] = layerID;
        newUpdates[`nodes/${this.sub_addNode.nodeID}/.layerAnchorNode`] = anchorNodeID; */
        return MergeDBUpdates(updates, newUpdates);
    }
};
AddSubnode = __decorate([
    UserEdit
], AddSubnode);
export { AddSubnode };
