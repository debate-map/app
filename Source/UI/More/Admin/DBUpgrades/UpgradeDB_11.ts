import {GetSearchTerms} from "Server/Commands/AddNodeRevision";
import {MapNodeRevision} from "Store/firebase/nodes/@MapNodeRevision";
import {Clone} from "js-vextensions";
import {FirebaseDBShape} from "Store/firebase";
import {TreeNode} from "mobx-firelink";
import {AddUpgradeFunc} from "../../Admin";

const newVersion = 11;
AddUpgradeFunc(newVersion, async(oldData, markProgress)=>{
	const data = Clone(oldData) as FirebaseDBShape;

	// populate "titles.allTerms" property of each node-revision
	// ==========

	// for (const revision of tree.Get(a=>a.nodeRevisions).VValues()) {
	// for (const revision of tree.subs.get('nodeRevisions').subs.VValues()) {
	for (const revision of data.nodeRevisions.VValues(true) as MapNodeRevision[]) {
		if (revision.titles == null) continue;
		const titles_joined = revision.titles.VValues(true).join(" ");
		revision.titles.allTerms = GetSearchTerms(titles_joined).ToMap(a=>a, ()=>true);
	}

	return data;
});