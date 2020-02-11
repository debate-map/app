var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { MapEdit } from "../CommandMacros";
import { E } from "js-vextensions";
import { Command, AssertV } from "mobx-firelink";
import { UserEdit } from "../CommandMacros";
import { LinkNode_HighLevel } from "./LinkNode_HighLevel";
import { GetNode } from "../Store/firebase/nodes";
import { MapNodeType } from "../Store/firebase/nodes/@MapNodeType";
let LinkNode = class LinkNode extends Command {
    /* async Prepare(parent_oldChildrenOrder_override?: number[]) {
        let {parentID, childID, childForm} = this.payload;
        this.parent_oldChildrenOrder = parent_oldChildrenOrder_override || await GetDataAsync(`nodes/${parentID}/.childrenOrder`) as number[];
    } */
    Validate() {
        var _a, _b, _c, _d, _e;
        const { parentID, childID } = this.payload;
        AssertV(parentID != childID, "Parent-id and child-id cannot be the same!");
        this.child_oldData = GetNode(childID);
        AssertV(this.child_oldData || this.parentCommand != null, "Child does not exist!");
        this.parent_oldData = (_b = (this.parentCommand instanceof LinkNode_HighLevel && this == this.parentCommand.sub_linkToNewParent ? (_a = this.parentCommand.sub_addArgumentWrapper) === null || _a === void 0 ? void 0 : _a.payload.node : null), (_b !== null && _b !== void 0 ? _b : GetNode(parentID)));
        AssertV(this.parent_oldData || this.parentCommand != null, "Parent does not exist!");
        if (this.parent_oldData) {
            AssertV(!((_c = this.parent_oldData.childrenOrder) === null || _c === void 0 ? void 0 : _c.includes(childID)), `Node #${childID} is already a child of node #${parentID}.`);
        }
        if (((_d = this.child_oldData) === null || _d === void 0 ? void 0 : _d.ownerMapID) != null) {
            AssertV(((_e = this.parent_oldData) === null || _e === void 0 ? void 0 : _e.ownerMapID) == this.child_oldData.ownerMapID, `Cannot paste private node #${childID} into a map not matching its owner map (${this.child_oldData.ownerMapID}).`);
            /* const newMap = GetMap(this.parent_oldData.ownerMapID);
            AssertV(newMap, 'newMap not yet loaded.');
            if (newMap.requireMapEditorsCanEdit) */
        }
    }
    GetDBUpdates() {
        const { parentID, childID, childForm, childPolarity } = this.payload;
        const updates = {};
        // add parent as parent-of-child
        updates[`nodes/${childID}/.parents/.${parentID}`] = { _: true };
        // add child as child-of-parent
        updates[`nodes/${parentID}/.children/.${childID}`] = E({ _: true }, childForm && { form: childForm }, childPolarity && { polarity: childPolarity });
        if (this.parent_oldData && this.parent_oldData.type == MapNodeType.Argument) {
            updates[`nodes/${parentID}/.childrenOrder`] = (this.parent_oldData.childrenOrder || []).concat([childID]);
        }
        return updates;
    }
};
LinkNode = __decorate([
    MapEdit,
    UserEdit
], LinkNode);
export { LinkNode };
