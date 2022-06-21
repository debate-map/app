import {GetValues} from "web-vcore/nm/js-vextensions.js";
import {AddSchema, Command, CommandMeta, DBHelper, Field, GetSchemaJSON, MGLClass, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {UserEdit} from "../CommandMacros/UserEdit.js";
import {ChildGroup, MapNodeType} from "../DB.js";
import {ClaimForm, Polarity} from "../DB/nodes/@MapNode.js";

@MGLClass()
export class TransferNodesPayload {
	@Field({items: {$ref: "NodeInfoForTransfer"}})
	nodes: NodeInfoForTransfer[];
}
@MGLClass()
export class NodeInfoForTransfer {
	@Field({type: ["string", "null"]}, {opt: true})
	nodeID?: string; // can be null, if transfer is of type "shim"

	@Field({type: ["string", "null"]}, {opt: true})
	oldParentID?: string;

	@Field({$ref: "TransferType"})
	transferType: TransferType;

	@Field({$ref: "MapNodeType"})
	clone_newType: MapNodeType;

	@Field({type: "boolean"})
	clone_keepChildren: boolean;

	@Field({type: ["string", "null"]}, {opt: true})
	newParentID?: string|n;

	@Field({$ref: "ChildGroup"}, {opt: true})
	childGroup: ChildGroup;

	@Field({$ref: "ClaimForm"}, {opt: true})
	claimForm?: ClaimForm|n;

	@Field({$ref: "Polarity"}, {opt: true})
	argumentPolarity?: Polarity|n;
}

/*export const TransferType_values = [
	"ignore",
	"move", "link", "clone",
	"shim",
	//"delete", // for the case of moving a claim to a place not needing an argument wrapper, where the old argument-wrapper would otherwise be left empty
] as const;
export type TransferType = typeof TransferType_values[number];
AddSchema("TransferType", {enum: GetValues(MapNodeType)});*/
export enum TransferType {
	ignore = "ignore",
	move = "move",
	link = "link",
	clone = "clone",
	shim = "shim",
}
AddSchema("TransferType", {enum: GetValues(TransferType)});

//@MapEdit
@UserEdit
/*@CommandRunMeta({
	record: true,
	record_cancelIfAncestorCanBeInStream: true,
	canShowInStream: true,
	rlsTargetPaths: [
		{table: "nodes", fieldPath: ["payload", "revision", "node"]},
	],
})*/
@CommandMeta({
	payloadSchema: ()=>GetSchemaJSON("TransferNodesPayload"),
	returnSchema: ()=>SimpleSchema({
		//$id: {type: "string"},
	}),
})
export class TransferNodes extends Command<TransferNodesPayload, {/*id: string*/}> {
	Validate() {
		console.log("Validate called. @payload:", this.payload);

		// todo

		this.returnData = {};
	}

	DeclareDBUpdates(db: DBHelper) {
		// todo
	}
}