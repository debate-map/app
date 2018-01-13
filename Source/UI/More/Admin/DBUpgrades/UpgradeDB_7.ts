import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {MapNodeRevision} from "../../../../Store/firebase/nodes/@MapNodeRevision";
import {MapNode, ChildEntry, Polarity} from "../../../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../../../Store/firebase/nodes/@MapNodeType";

let newVersion = 7;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = Clone(oldData) as FirebaseData;

	// add polarity field to node parent-child links
	// ==========

	for (let parentNode of data.nodes.VValues(true)) {
		for (let {name: childIDStr, value: childLink} of parentNode.children.Props(true)) {
			let childNode = data.nodes[childIDStr];
			childLink.polarity = childNode.type == 60 ? Polarity.Opposing : Polarity.Supporting;
		}
	}

	// merge SupportingArgument and OpposingArgument
	// ==========

	for (let node of data.nodes.VValues(true)) {
		if (node.type == 60) {
			node.type = MapNodeType.Argument;
		}
	}

	// node revision-system
	// ==========

	let lastRevisionID = 0;

	data.nodeRevisions = {};
	for (let node of data.nodes.VValues(true)) {
		let revision = new MapNodeRevision({node: node._id});

		let simplePropTransfers = ["titles", "note", "approved", "votingDisabled", "accessLevel", "voteLevel",
			"relative", "fontSizeOverride", "widthOverride", "equation", "contentNode", "image"];
		for (let prop of simplePropTransfers) {
			revision[prop] = node[prop];
			delete node[prop];
		}

		let simplePropCopies = ["creator", "createdAt"];
		for (let prop of simplePropCopies) {
			revision[prop] = node[prop];
		}

		revision.impactPremise = node["metaThesis"];
		delete node["metaThesis"];

		data.nodeRevisions[++lastRevisionID] = revision;
		node.currentRevision = lastRevisionID;
	}

	data.general.lastNodeRevisionID = lastRevisionID;

	// rating rename (adjustment -> impact)
	// ==========

	for (let ratingsRoot of data.nodeRatings.VValues(true)) {
		if (ratingsRoot.adjustment) {
			ratingsRoot.impact = ratingsRoot.adjustment;
			delete ratingsRoot.adjustment;
		}
	}

	// convert the 4 (old) polarized then-types into the 2 (new) unpolarized versions
	// ==========

	let oldValues = {StrengthenParent: 10, GuaranteeParentTrue: 20, WeakenParent: 30, GuaranteeParentFalse: 40};
	let newValues = {Impact: 10, Guarantee: 20};
	let conversions = {
		[oldValues.StrengthenParent]: newValues.Impact, [oldValues.WeakenParent]: newValues.Impact,
		[oldValues.GuaranteeParentTrue]: newValues.Guarantee, [oldValues.GuaranteeParentFalse]: newValues.Guarantee,
	};

	for (let revision of data.nodeRevisions.VValues(true)) {
		if (revision.impactPremise) {
			revision.impactPremise.thenType = conversions[revision.impactPremise.thenType];
		}
	}

	return data;
});