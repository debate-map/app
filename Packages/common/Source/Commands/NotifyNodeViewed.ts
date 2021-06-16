/* import { Assert } from 'js-vextensions';
import { GetNode } from 'Store/firebase/nodes';
import {GetAsync} from 'web-vcore';
import {Command} from 'web-vcore';

export class NotifyNodeViewed extends Command<{nodeID: string}, {}> {
	Validate() {
		const { nodeID } = this.payload;
		// const nodeData = await GetDataAsync('nodes', nodeID) as MapNode;
		const nodeData = GetNode(nodeID);
		AssertV(nodeData, `Node #${nodeID} must exist for you to view it!`);
	}

	GetDBUpdates() {
		const { nodeID } = this.payload;

		const updates = {};
		updates[`nodeViewers/${nodeID}/.${this.userInfo.id}`] = true;
		updates[`userViewedNodes/${this.userInfo.id}/.${nodeID}`] = true;
		return updates;
	}
} */