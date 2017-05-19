import {Assert} from "../../Frame/General/Assert";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {DeepGet} from "../../Frame/V/V";
import {GetValues_ForSchema} from "../../Frame/General/Enums";

AddSchema({
	properties: {
		nodeID: {type: "number"},
		nodeUpdates: Schema({
			properties: {
				titles: {
					properties: {
						base: {type: "string"}, negation: {type: "string"}, yesNoQuestion: {type: "string"},
					},
					//required: ["base", "negation", "yesNoQuestion"],
				},
				relative: {type: "boolean"},
				widthOverride: {type: ["null", "number"]},

				metaThesis: {$ref: "MetaThesisInfo"},
				contentNode: {$ref: "ContentNode"},
				equation: {$ref: "Equation"},

				//chainAfter: {oneOf: [{type: "null"}, {type: "string", pattern: MapNode_chainAfterFormat}]},
				childrenOrder: {items: {type: "number"}},
			},
		}),
		linkParentID: {type: "number"},
		linkUpdates: Schema({
			properties: {_: {type: "boolean"}, form: {oneOf: GetValues_ForSchema(ThesisForm)}},
		}),
	},
	required: ["nodeID", "nodeUpdates", "linkParentID", "linkUpdates"],
}, "UpdateNodeDetails_payload");

export default class UpdateNodeDetails extends Command<{nodeID: number, nodeUpdates: Partial<MapNode>, linkParentID: number, linkUpdates: Partial<ChildEntry>}> {
	Validate_Early() {
		/*let allowedNodePropUpdates = ["relative", "titles", "contentNode"];
		Assert(nodeUpdates.VKeys().Except(...allowedNodePropUpdates).length == 0,
			`Cannot use this command to update node-props other than: ${allowedNodePropUpdates.join(", ")
			}\n\nYou provided: ${nodeUpdates.VKeys().Except(...allowedNodePropUpdates).join(", ")}`);
		let allowedLinkPropUpdates = ["form"];
		Assert(linkUpdates.VKeys().Except(...allowedLinkPropUpdates).length == 0,
			`Cannot use this command to update link-props other than: ${allowedLinkPropUpdates.join(", ")
			}\n\nYou provided: ${linkUpdates.VKeys().Except(...allowedLinkPropUpdates).join(", ")}`);*/
		
		AssertValidate("UpdateNodeDetails_payload", this.payload, `Payload invalid`);
	}

	oldNodeData: MapNode;
	newNodeData: MapNode;
	oldLinkData: ChildEntry;
	newLinkData: ChildEntry;
	async Prepare() {
		let {nodeID, nodeUpdates, linkParentID, linkUpdates} = this.payload;
		let firebase = store.firebase.helpers;
		
		this.oldNodeData = await GetDataAsync(`nodes/${nodeID}`, true, false) as MapNode;
		this.newNodeData = {...this.oldNodeData, ...nodeUpdates};
		this.oldLinkData = await GetDataAsync(`nodes/${linkParentID}/children/${nodeID}`, true, false) as ChildEntry;
		this.newLinkData = {...this.oldLinkData, ...linkUpdates};
	}
	async Validate() {
		//if (!AssertValidate("MapNode", newData, `New-data invalid`);
		AssertValidate("MapNode", this.newNodeData, `New node-data invalid`);
		AssertValidate("ChildEntry", this.newLinkData, `New link-data invalid`);
	}
	
	GetDBUpdates() {
		let {nodeID, nodeUpdates, linkParentID, linkUpdates} = this.payload;
		let updates = {};
		updates[`nodes/${nodeID}`] = this.newNodeData;
		updates[`nodes/${linkParentID}/children/${nodeID}`] = this.newLinkData;
		return updates;
	}
}