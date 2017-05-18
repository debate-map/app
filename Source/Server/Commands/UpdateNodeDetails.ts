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
				contentNode: {$ref: "ContentNode"},
				metaThesis: {$ref: "MetaThesisInfo"},
				widthOverride: {oneOf: [{type: "null"}, {type: "number"}]},
				//chainAfter: {oneOf: [{type: "null"}, {type: "string", pattern: MapNode_chainAfterFormat}]},
				childrenOrder: {items: {type: "number"}},
			},
			//required: ["relative", "titles", "contentNode"],
		}),
		linkParentID: {type: "number"},
		linkUpdates: Schema({
			properties: {_: {type: "boolean"}, form: {oneOf: GetValues_ForSchema(ThesisForm)}},
			//required: ["_"],
		}),
	},
	required: ["nodeID", "nodeUpdates", "linkParentID", "linkUpdates"],
}, "UpdateNodeDetails_payload");

export default class UpdateNodeDetails extends Command<{nodeID: number, nodeUpdates: Partial<MapNode>, linkParentID: number, linkUpdates: Partial<ChildEntry>}> {
	async Run() {
		let {nodeID, nodeUpdates, linkParentID, linkUpdates} = this.payload;
		let firebase = store.firebase.helpers;
		
		// validate call
		// ==========

		/*let allowedNodePropUpdates = ["relative", "titles", "contentNode"];
		Assert(nodeUpdates.VKeys().Except(...allowedNodePropUpdates).length == 0,
			`Cannot use this command to update node-props other than: ${allowedNodePropUpdates.join(", ")
			}\n\nYou provided: ${nodeUpdates.VKeys().Except(...allowedNodePropUpdates).join(", ")}`);
		let allowedLinkPropUpdates = ["form"];
		Assert(linkUpdates.VKeys().Except(...allowedLinkPropUpdates).length == 0,
			`Cannot use this command to update link-props other than: ${allowedLinkPropUpdates.join(", ")
			}\n\nYou provided: ${linkUpdates.VKeys().Except(...allowedLinkPropUpdates).join(", ")}`);*/
		
		Assert(ajv.validate("UpdateNodeDetails_payload", this.payload), `Payload invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(this.payload, null, 3)}\n`);

		// prepare
		// ==========
		
		let oldNodeData = await GetDataAsync(`nodes/${nodeID}`, true, false);
		let newNodeData = {...oldNodeData, ...nodeUpdates};
		let oldLinkData = await GetDataAsync(`nodes/${linkParentID}/children/${nodeID}`, true, false);
		let newLinkData = {...oldLinkData, ...linkUpdates};
		
		// validate state
		// ==========

		//if (!ajv.validate("MapNode", newData)) throw new Error(`New-data invalid: ${ajv.FullErrorsText()}`);
		Assert(ajv.validate("MapNode", newNodeData), `New node-data invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(newNodeData, null, 3)}\n`);
		Assert(ajv.validate("ChildEntry", newLinkData), `New link-data invalid: ${ajv.FullErrorsText()}\nData: ${ToJSON(newLinkData, null, 3)}\n`);

		// execute
		// ==========

		let dbUpdates = {};
		dbUpdates[`nodes/${nodeID}`] = newNodeData;
		dbUpdates[`nodes/${linkParentID}/children/${nodeID}`] = newLinkData;
		await firebase.Ref().update(dbUpdates);
	}
}