import { AssertV, Command, MergeDBUpdates, GenerateUUID } from "mobx-firelink";
import { AssertValidate, Validate } from "mobx-firelink";
import { FromJSON, Clone, CE, DEL } from "js-vextensions";
import { AddChildNode } from "./AddChildNode";
import { LinkNode } from "./LinkNode";
import { HasAdminPermissions } from "../Store/firebase/users/$user";
import { AsNodeL1 } from "../Store/firebase/nodes/$node";
import { WithoutHelpers } from "./ImportSubtree_Old";
// for export from old site (see commented code in MI_ExportSubtree.tsx)
export class ImportSubtree extends Command {
    constructor() {
        super(...arguments);
        this.subs = [];
        this.oldID_newID = {};
        this.nodeRatingsToAdd = [];
    }
    Validate() {
        var _a;
        AssertV(HasAdminPermissions(this.userInfo.id), "Only admins can run the import-subtree command.");
        AssertValidate({
            properties: {
                mapID: { type: "string" },
                parentNodeID: { type: "string" },
                subtreeJSON: { type: "string" },
                nodesToLink: { patternProperties: { "[0-9]+": { type: "string" } } },
                importRatings: { type: "boolean" },
                importRatings_userIDs: { items: { type: "string" } },
            },
            required: ["subtreeJSON"],
        }, this.payload, "Payload invalid");
        const { subtreeJSON, parentNodeID, nodesToLink } = this.payload;
        this.rootSubtreeData = FromJSON(subtreeJSON);
        // clear each run, since validate gets called more than once
        this.subs_last = this.subs;
        this.subs = [];
        this.oldID_newID = (_a = Clone(nodesToLink), (_a !== null && _a !== void 0 ? _a : {}));
        this.nodeRatingsToAdd = [];
        this.ProcessSubtree(this.rootSubtreeData, parentNodeID);
    }
    ProcessSubtree(subtreeData, parentID) {
        var _a, _b;
        const { mapID, importRatings, importRatings_userIDs } = this.payload;
        const node = AsNodeL1(WithoutHelpers(subtreeData).Excluding("ratings", "childrenData", "finalPolarity", "currentRevision", "parents", "children", "childrenOrder"));
        const revision = WithoutHelpers(subtreeData.current).Excluding("node", "approved", "relative", "voteLevel");
        if (revision.image)
            revision.image.id = `${revision.image.id}`;
        if (revision["contentNode"]) {
            CE(revision).VSet({ quote: revision["contentNode"], contentNode: DEL });
            if (revision.quote.sourceChains.length) {
                revision.quote.sourceChains = revision.quote.sourceChains.map(sourceChainSources => {
                    return { sources: sourceChainSources };
                });
            }
        }
        const oldID = subtreeData["_id"];
        if (this.oldID_newID[oldID]) {
            const newID = this.oldID_newID[oldID];
            //const linkNodeCommand = new LinkNode_HighLevel({mapID, parentID, node, revision}).MarkAsSubcommand(this);
            const linkNodeCommand = (_a = this.subs_last[this.subs.length], (_a !== null && _a !== void 0 ? _a : new LinkNode({ mapID, parentID, childID: newID, childForm: subtreeData.link.form, childPolarity: subtreeData.link.polarity }).MarkAsSubcommand(this)));
            linkNodeCommand.Validate();
            this.subs.push(linkNodeCommand);
        }
        else {
            const addNodeCommand = (_b = this.subs_last[this.subs.length], (_b !== null && _b !== void 0 ? _b : new AddChildNode({ mapID, parentID, node, revision, link: WithoutHelpers(subtreeData.link) }).MarkAsSubcommand(this)));
            addNodeCommand.Validate();
            this.oldID_newID[oldID] = addNodeCommand.sub_addNode.nodeID;
            this.subs.push(addNodeCommand);
            for (const pair of CE(subtreeData.childrenData).Pairs()) {
                this.ProcessSubtree(pair.value, addNodeCommand.sub_addNode.nodeID);
            }
            if (subtreeData.childrenOrder) {
                //node.childrenOrder = subtreeData.childrenOrder.map(oldID=>{
                addNodeCommand.sub_addNode.payload.node.childrenOrder = subtreeData.childrenOrder.SelectMany(oldChildID => {
                    //AssertV(this.oldID_newID[oldID], `Cannot find newID for oldID: ${oldID}`);
                    // data from old site has childrenOrder's with deleted node-ids -- so just leave out the missing ones
                    if (this.oldID_newID[oldChildID] == null)
                        return [];
                    return [this.oldID_newID[oldChildID]];
                });
            }
        }
        if (importRatings && subtreeData.ratings) {
            for (let { key: ratingType, value: ratingsByUser } of subtreeData.ratings.Pairs()) {
                if (Validate("RatingType", ratingType) != null)
                    continue;
                for (let { key: userID, value: rating } of ratingsByUser.Pairs()) {
                    if (Validate("UserID", userID) != null)
                        continue;
                    if (importRatings_userIDs != null && !importRatings_userIDs.includes(userID))
                        continue;
                    let newNodeID = this.oldID_newID[oldID];
                    //let addRatingCommand = new SetNodeRating({nodeID: newNodeID, ratingType: ratingType as RatingType, value: rating.value, userID}).MarkAsSubcommand(this);
                    this.nodeRatingsToAdd.push({ node: newNodeID, type: ratingType, user: userID, updated: rating.updated, value: rating.value });
                }
            }
        }
    }
    GetDBUpdates() {
        let updates = {};
        for (const sub of this.subs) {
            updates = MergeDBUpdates(updates, sub.GetDBUpdates());
        }
        for (let rating of this.nodeRatingsToAdd) {
            updates[`nodeRatings/${GenerateUUID()}`] = rating;
        }
        return updates;
    }
}
