var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CE } from "js-vextensions";
import { AssertV, AssertValidate, Command, GenerateUUID } from "mobx-firelink";
import { MapEdit, UserEdit } from "../CommandMacros";
import { GetNode } from "../Store/firebase/nodes";
/** Returned terms are all lowercase. */
export function GetSearchTerms(str) {
    return GetSearchTerms_Advanced(str, false).wholeTerms;
}
/** Returned terms are all lowercase. */
export function GetSearchTerms_Advanced(str, separateTermsWithWildcard = true) {
    const terms = str.toLowerCase().replace(/[^a-zA-Z0-9*]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(a => a != ""); // eslint-disable-line
    const wholeTerms = CE(terms.filter(a => (separateTermsWithWildcard ? !a.includes("*") : true)).map(a => a.replace(/\*/g, ""))).Distinct().filter(a => a != "");
    const partialTerms = CE(terms.filter(a => (separateTermsWithWildcard ? a.includes("*") : false)).map(a => a.replace(/\*/g, ""))).Distinct().filter(a => a != "");
    return { wholeTerms, partialTerms };
}
let AddNodeRevision = class AddNodeRevision extends Command {
    Validate() {
        var _a;
        const { revision } = this.payload;
        // this.revisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + this.lastNodeRevisionID_addAmount + 1;
        this.revisionID = (_a = this.revisionID, (_a !== null && _a !== void 0 ? _a : GenerateUUID()));
        revision.creator = this.userInfo.id;
        revision.createdAt = Date.now();
        const titles_joined = CE(revision.titles || {}).VValues().join(" ");
        revision.titles.allTerms = CE(GetSearchTerms(titles_joined)).ToMap(a => a, () => true);
        if (this.parentCommand == null) {
            this.node_oldData = GetNode(revision.node);
            AssertV(this.node_oldData, "node_oldData is null.");
        }
        this.returnData = this.revisionID;
        AssertValidate("MapNodeRevision", revision, "Revision invalid");
    }
    GetDBUpdates() {
        const { mapID, revision } = this.payload;
        const updates = {};
        // updates['general/data/.lastNodeRevisionID'] = this.revisionID;
        updates[`nodes/${revision.node}/.currentRevision`] = this.revisionID;
        updates[`nodeRevisions/${this.revisionID}`] = revision;
        // updates[`maps/${mapID}/nodeEditTimes/data/.${revision.node}`] = revision.createdAt;
        updates[`mapNodeEditTimes/${mapID}/.${revision.node}`] = revision.createdAt;
        return updates;
    }
};
AddNodeRevision = __decorate([
    MapEdit,
    UserEdit
], AddNodeRevision);
export { AddNodeRevision };
