import {Clone} from "web-vcore/nm/js-vextensions";
import {TreeNode} from "web-vcore/nm/mobx-graphlink";
import {FirebaseDBShape, MapNodeRevision, GetSearchTerms} from "@debate-map/server-link/Source/Link";


import {AddUpgradeFunc} from "../../Admin";

const newVersion = 11;
AddUpgradeFunc(newVersion, async(oldData, markProgress)=>{
	const data = Clone(oldData) as FirebaseDBShape;

	// populate "titles.allTerms" property of each node-revision
	// ==========

	// for (const revision of tree.Get(a=>a.nodeRevisions).VValues()) {
	// for (const revision of tree.subs.get('nodeRevisions').subs.VValues()) {
	for (const revision of data.nodeRevisions.VValues() as MapNodeRevision[]) {
		if (revision.titles == null) continue;
		const titles_joined = revision.titles.VValues().join(" ");
		revision.titles.allTerms = GetSearchTerms(titles_joined).ToMapObj(a=>a, ()=>true);
	}

	return data;
});