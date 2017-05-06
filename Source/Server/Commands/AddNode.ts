import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";

export default class AddNode extends Command<{node: MapNode, link: ChildEntry, metaThesisNode?: MapNode}> {
	async Run() {
		let {node, link, metaThesisNode} = this.payload;
		let firebase = store.firebase.helpers;

		let lastNodeID_new = await GetDataAsync(`general/lastNodeID`) as number;
		let nodeID = ++lastNodeID_new;
		let metaThesisID = metaThesisNode ? ++lastNodeID_new : null;

		// validate call
		// ==========

		Assert(node.parents && node.parents.VKeys().length == 1, `Node must have exactly one parent`);
		if (metaThesisNode) {
			//Assert(node.children == null, `Node cannot specify children. (server adds meta-thesis automatically)`);
			Assert(metaThesisNode.parents == null, `Meta-thesis cannot specify a parent. (server adds it automatically)`);
		}

		// prepare
		// ==========
		
		if (metaThesisNode) {
			node.children = {...node.children, [metaThesisID]: {_: true}};
			metaThesisNode.parents = {[nodeID]: {_: true}};
		}

		// validate state
		// ==========

		if (!ajv.validate(`MapNode`, node)) throw new Error(`Node invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(node, null, 3)}\n`);
		if (!ajv.validate(`ChildEntry`, link)) throw new Error(`Link invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(link, null, 3)}\n`);
		if (!ajv.validate(`MapNode`, metaThesisNode)) throw new Error(`Meta-thesis-node invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(metaThesisNode)}\n`);

		// execute
		// ==========

		let updates = {
			"general/lastNodeID": lastNodeID_new,
			[`nodes/${nodeID}`]: node,
			// add as child of parent
			[`nodes/${node.parents.VKeys(true)[0]}/children/${nodeID}`]: link,
		};
		// add as parent of (pre-existing) children
		for (let childID in (node.children || {}).Excluding(metaThesisID && metaThesisID.toString())) {
			updates[`nodes/${childID}/parents/${nodeID}`] = {_: true};
		}
		if (metaThesisNode) {
			// add meta-thesis
			updates[`nodes/${metaThesisID}`] = metaThesisNode;
			// add meta-thesis as parent of (pre-existing) children
			for (let childID in metaThesisNode.children) {
				updates[`nodes/${childID}/parents/${metaThesisID}`] = {_: true};
			}
		}
		await firebase.Ref().update(updates);
	}
}