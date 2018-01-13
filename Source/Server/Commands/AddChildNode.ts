import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command, MergeDBUpdates} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import { UserEdit, MapEdit } from "Server/CommandMacros";
import AddNode from "./AddNode";
import { MapNodeRevision } from "Store/firebase/nodes/@MapNodeRevision";
import LinkNode from "./LinkNode";
import AddNodeRevision from "./AddNodeRevision";

@MapEdit
@UserEdit
export default class AddChildNode extends Command
		<{
			mapID: number, node: MapNode, revision: MapNodeRevision, link?: ChildEntry,
			impactPremiseNode?: MapNode, impactPremiseNodeRevision?: MapNodeRevision, asMapRoot?: boolean,
		}> {
	Validate_Early() {
		let {node, revision, link, impactPremiseNode, asMapRoot} = this.payload;
		if (!asMapRoot) {
			Assert(node.parents && node.parents.VKeys().length == 1, `Node must have exactly one parent`);
		}
		Assert(node.currentRevision == null, "Cannot specifiy node's revision-id. It will be generated automatically.");
		Assert(revision.node == null, "Cannot specifiy revision's node-id. It will be generated automatically.");
	}

	sub_addNode: AddNode;
	sub_addRevision: AddNodeRevision;
	sub_addImpactPremise: AddNode;
	sub_linkImpactPremise: LinkNode;
	parentID: number;
	parent_oldChildrenOrder: number[];
	async Prepare() {
		let {mapID, node, revision, link, impactPremiseNode, asMapRoot} = this.payload;

		this.sub_addNode = new AddNode({node});
		this.sub_addNode.asSubcommand = true;
		await this.sub_addNode.Prepare();

		this.sub_addRevision = new AddNodeRevision({revision});
		this.sub_addRevision.asSubcommand = true;
		await this.sub_addRevision.Prepare();

		node.currentRevision = this.sub_addRevision.revisionID;
		revision.node = this.sub_addNode.nodeID;

		if (impactPremiseNode) {
			this.sub_addImpactPremise = new AddNode({node: impactPremiseNode});
			this.sub_addImpactPremise.asSubcommand = true;
			await this.sub_addImpactPremise.Prepare();

			this.sub_linkImpactPremise = new LinkNode({mapID, parentID: this.sub_addNode.nodeID, childID: this.sub_addImpactPremise.nodeID, childForm: null});
			//this.sub_linkImpactPremise.asSubcommand = true;
			await this.sub_linkImpactPremise.Prepare();
		}

		if (!asMapRoot) {
			this.parentID = node.parents.VKeys(true)[0].ToInt();
			this.parent_oldChildrenOrder = await GetDataAsync("nodes", this.parentID, "childrenOrder") as number[];
		}

		this.returnData = this.sub_addNode.nodeID;
	}
	async Validate() {
		let {node, link, impactPremiseNode, asMapRoot} = this.payload;
		await this.sub_addNode.Validate();
		await this.sub_addRevision.Validate();
		if (impactPremiseNode) {
			await this.sub_addImpactPremise.Validate();
			await this.sub_linkImpactPremise.Validate();
		}
		if (!asMapRoot) {
			AssertValidate(`ChildEntry`, link, `Link invalid`);
		}
	}
	
	GetDBUpdates() {
		let {node, link, impactPremiseNode, asMapRoot} = this.payload;
		let updates = this.sub_addNode.GetDBUpdates();
		updates = MergeDBUpdates(updates, this.sub_addRevision.GetDBUpdates());
		if (impactPremiseNode) {
			updates = MergeDBUpdates(updates, this.sub_addImpactPremise.GetDBUpdates());
			updates = MergeDBUpdates(updates, this.sub_linkImpactPremise.GetDBUpdates());
		}
		
		let newUpdates = {};
		// add as child of parent
		if (!asMapRoot) {
			newUpdates[`nodes/${this.parentID}/children/${this.sub_addNode.nodeID}`] = link;
			if (this.parent_oldChildrenOrder) {
				newUpdates[`nodes/${this.parentID}/childrenOrder`] = this.parent_oldChildrenOrder.concat([this.sub_addNode.nodeID]);
			}
		}

		return MergeDBUpdates(updates, newUpdates);
	}
}