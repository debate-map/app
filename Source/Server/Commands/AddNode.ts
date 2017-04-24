import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";

export default class AddNode extends Command<{node: MapNode, form: ThesisForm, metaThesisNode?: MapNode}> {
	async Run() {
		let {node, form, metaThesisNode} = this.payload;
		let firebase = store.firebase.helpers;

		let lastNodeID_new = await GetDataAsync(`general/lastNodeID`) as number;
		let nodeID = ++lastNodeID_new;
		let metaThesisID = metaThesisNode ? ++lastNodeID_new : null;

		// validate call
		// ==========

		Assert(node.parents && node.parents.VKeys(true).length == 1, "Node must have exactly one parent");
		if (metaThesisNode) {
			Assert(node.children == null, "Node cannot specify children. (server adds meta-thesis automatically)");
			Assert(metaThesisNode.parents == null, "Meta-thesis cannot specify a parent. (server adds it automatically)");
		}

		// prepare
		// ==========
		
		if (metaThesisNode) {
			node.children = {[metaThesisID]: {_: true}};
			metaThesisNode.parents = {[nodeID]: {_: true}};
		}

		// validate state
		// ==========

		if (!ajv.validate("MapNode", node)) throw new Error("Node invalid: " + ajv.errorsText());
		if (!ajv.validate("MapNode", metaThesisNode)) throw new Error("Meta-thesis-node invalid: " + ajv.errorsText());

		// execute
		// ==========

		/*await firebase.Ref(`nodes/${nodeID}`).set(node);

		// for each parent, add self as child
		/*await Promise.all(node.parents.VKeys(true).map(parentID=> {
			return firebase.Ref(`nodes/${parentID}/children`).update({[nodeID]: E({_: true}, form && {form})});
		}));*#/
		await firebase.Ref(`nodes/${node.parents.VKeys(true)[0]}/children`).update({[nodeID]: E({_: true}, form && {form})});

		if (metaThesisNode) {
			await firebase.Ref(`nodes/${metaThesisID}`).set(metaThesisNode);
		}*/

		await firebase.Ref().update(E(
			{
				"general/lastNodeID": lastNodeID_new,
				[`nodes/${nodeID}`]: node,
				[`nodes/${node.parents.VKeys(true)[0]}/children/${nodeID}`]: E({_: true}, form && {form}),
			},
			metaThesisNode && {
				[`nodes/${metaThesisID}`]: metaThesisNode,
			}
		));
	}
}