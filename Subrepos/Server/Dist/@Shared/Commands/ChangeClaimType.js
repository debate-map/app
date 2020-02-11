var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { GetValues_ForSchema, CE } from "js-vextensions";
import { AssertV, AV, Command } from "mobx-firelink";
import { MapEdit, UserEdit } from "../CommandMacros";
import { AddSchema, AssertValidate, GenerateUUID } from "mobx-firelink";
import { AttachmentType, GetAttachmentType } from "../Store/firebase/nodeRevisions/@AttachmentType";
import { GetNodeL2, AsNodeL1 } from "../Store/firebase/nodes/$node";
import { EquationAttachment } from "../Store/firebase/nodeRevisions/@EquationAttachment";
export const conversionTypes = [
    // from normal to...
    "Normal>Equation",
    // each type back to normal
    "Equation>Normal",
];
export function CanConvertFromClaimTypeXToY(from, to) {
    return conversionTypes.includes(`${AttachmentType[from]}>${AttachmentType[to]}`);
}
AddSchema("ChangeClaimType_payload", {
    properties: {
        mapID: { type: "string" },
        nodeID: { type: "string" },
        newType: { oneOf: GetValues_ForSchema(AttachmentType) },
    },
    required: ["nodeID", "newType"],
});
let ChangeClaimType = class ChangeClaimType extends Command {
    Validate() {
        var _a;
        AssertValidate("ChangeClaimType_payload", this.payload, "Payload invalid");
        const { nodeID, newType } = this.payload;
        // let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
        const oldData = AV.NonNull = GetNodeL2(nodeID);
        this.oldType = GetAttachmentType(oldData);
        this.newData = Object.assign({}, AsNodeL1(oldData));
        // this.newRevisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + 1;
        this.newRevisionID = (_a = this.newRevisionID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        this.newRevision = Object.assign({}, oldData.current);
        this.newData.currentRevision = this.newRevisionID;
        if (this.oldType == AttachmentType.None) {
            if (newType == AttachmentType.Equation) {
                this.newRevision.equation = CE(new EquationAttachment()).VSet({ text: this.newRevision.titles.base });
                delete this.newRevision.titles;
            }
        }
        else if (this.oldType == AttachmentType.Equation) {
            if (newType == AttachmentType.None) {
                this.newRevision.titles = { base: this.newRevision.equation.text };
                delete this.newRevision.equation;
            }
        }
        AssertV(CanConvertFromClaimTypeXToY(this.oldType, newType), `Cannot convert from claim-type ${AttachmentType[this.oldType]} to ${AttachmentType[newType]}.`);
        AssertValidate("MapNode", this.newData, "New node-data invalid");
        AssertValidate("MapNodeRevision", this.newRevisionID, "New revision-data invalid");
    }
    GetDBUpdates() {
        const { nodeID } = this.payload;
        const updates = {};
        updates[`nodes/${nodeID}`] = this.newData;
        // updates['general/data/.lastNodeRevisionID'] = this.newRevisionID;
        updates[`nodeRevisions/${this.newRevisionID}`] = this.newRevision;
        return updates;
    }
};
ChangeClaimType = __decorate([
    MapEdit,
    UserEdit
], ChangeClaimType);
export { ChangeClaimType };
