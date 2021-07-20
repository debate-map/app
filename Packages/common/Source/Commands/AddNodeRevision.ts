import {CE} from "web-vcore/nm/js-vextensions.js";
import {AssertV, AssertValidate, Command, CommandMeta, DBHelper, dbp, GenerateUUID, WrapDBValue} from "web-vcore/nm/mobx-graphlink.js";
import {MapEdit, UserEdit} from "../CommandMacros.js";
import {GetNode} from "../DB/nodes.js";
import {MapNode} from "../DB/nodes/@MapNode.js";
import {MapNodeRevision} from "../DB/nodes/@MapNodeRevision.js";

/** Returned terms are all lowercase. */
export function GetSearchTerms(str: string) {
	return GetSearchTerms_Advanced(str, false).wholeTerms;
}
/** Returned terms are all lowercase. */
export function GetSearchTerms_Advanced(str: string, separateTermsWithWildcard = true) {
	const terms = str.toLowerCase().replace(/[^a-zA-Z0-9*]/g, ' ').replace(/ +/g, ' ').trim().split(' ').filter(a=>a != ""); // eslint-disable-line
	const wholeTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? !a.includes("*") : true)).map(a=>a.replace(/\*/g, ""))).Distinct().filter(a=>a != "");
	const partialTerms = CE(terms.filter(a=>(separateTermsWithWildcard ? a.includes("*") : false)).map(a=>a.replace(/\*/g, ""))).Distinct().filter(a=>a != "");
	return {wholeTerms, partialTerms};
}

@MapEdit
@UserEdit
@CommandMeta({
	payloadSchema: ()=>({}),
})
export class AddNodeRevision extends Command<{mapID?: string|n, revision: MapNodeRevision}, {id: string}> {
	// lastNodeRevisionID_addAmount = 0;

	revisionID: string;
	node_oldData: MapNode|n;
	Validate() {
		const {revision} = this.payload;

		// this.revisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + this.lastNodeRevisionID_addAmount + 1;
		this.revisionID = this.revisionID ?? GenerateUUID();
		revision.creator = this.userInfo.id;
		revision.createdAt = Date.now();

		/*const titles_joined = CE(revision.titles || {}).VValues().join(" ");
		revision.titles.allTerms = CE(GetSearchTerms(titles_joined)).ToMapObj(a=>a, ()=>true);*/

		if (this.parentCommand == null) {
			this.node_oldData = GetNode.NN(revision.node);
		}

		this.returnData = {id: this.revisionID};

		AssertValidate("MapNodeRevision", revision, "Revision invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {mapID, revision} = this.payload;
		//db.set('general/data/.lastNodeRevisionID', this.revisionID);
		db.set(dbp`nodes/${revision.node}/.currentRevision`, this.revisionID);
		db.set(dbp`nodeRevisions/${this.revisionID}`, revision);
		if (mapID != null) {
			//db.set(dbp`maps/${mapID}/nodeEditTimes/data/.${revision.node}`, revision.createdAt);
			db.set(dbp`mapNodeEditTimes/${mapID}/.${revision.node}`, WrapDBValue(revision.createdAt, {merge: true}));
		}
	}
}