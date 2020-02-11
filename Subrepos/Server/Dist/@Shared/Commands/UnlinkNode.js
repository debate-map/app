var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Command, AssertV } from "mobx-firelink";
import { MapEdit, UserEdit } from "../CommandMacros";
import { GetNode, IsRootNode, IsNodeSubnode } from "../Store/firebase/nodes";
import { GetNodeL2 } from "../Store/firebase/nodes/$node";
import { IsUserCreatorOrMod } from "../Store/firebase/users/$user";
import { CE } from "js-vextensions";
// todo: add full-fledged checking to ensure that nodes are never orphaned by move commands (probably use parents recursion to find at least one map root)
let UnlinkNode = class UnlinkNode extends Command {
    constructor() {
        super(...arguments);
        this.allowOrphaning = false; // could also be named "asPartOfCut", to be consistent with ForUnlink_GetError parameter
    }
    Validate() {
        var _a;
        const { parentID, childID } = this.payload;
        this.parent_oldChildrenOrder = (_a = GetNode(parentID)) === null || _a === void 0 ? void 0 : _a.childrenOrder;
        /* let {parentID, childID} = this.payload;
        let childNode = await GetNodeAsync(childID);
        let parentNodes = await GetNodeParentsAsync(childNode);
        Assert(parentNodes.length > 1, "Cannot unlink this child, as doing so would orphan it. Try deleting it instead."); */
        const oldData = GetNodeL2(childID);
        AssertV(oldData, "oldData was null.");
        const baseText = `Cannot unlink node #${oldData._key}, since `;
        AssertV(IsUserCreatorOrMod(this.userInfo.id, oldData), `${baseText}you are not its owner. (or a mod)`);
        AssertV(this.allowOrphaning || CE(oldData.parents || {}).VKeys().length > 1, `${baseText}doing so would orphan it. Try deleting it instead.`);
        AssertV(!IsRootNode(oldData), `${baseText}it's the root-node of a map.`);
        AssertV(!IsNodeSubnode(oldData), `${baseText}it's a subnode. Try deleting it instead.`);
    }
    GetDBUpdates() {
        const { parentID, childID } = this.payload;
        const updates = {};
        updates[`nodes/${childID}/.parents/.${parentID}`] = null;
        updates[`nodes/${parentID}/.children/.${childID}`] = null;
        if (this.parent_oldChildrenOrder) {
            updates[`nodes/${parentID}/.childrenOrder`] = CE(CE(this.parent_oldChildrenOrder).Except(childID)).IfEmptyThen(null);
        }
        return updates;
    }
};
UnlinkNode = __decorate([
    MapEdit,
    UserEdit
], UnlinkNode);
export { UnlinkNode };
