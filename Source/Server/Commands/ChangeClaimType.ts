import {Assert} from "js-vextensions";
import {GetDataAsync} from "./../../Frame/Database/DatabaseHelpers";
import {Command} from "./../Command";
import {MapNode, ClaimForm, ChildEntry, ClaimType, MapNodeL2} from "./../../Store/firebase/nodes/@MapNode";
import {E} from "./../../Frame/General/Others";
import {GetValues_ForSchema} from "./../../Frame/General/Enums";
import {GetClaimType, GetNodeL2} from "./../../Store/firebase/nodes/$node";
import {Equation} from "./../../Store/firebase/nodes/@Equation";
import {UserEdit} from "./../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetNode} from "Store/firebase/nodes";
import {MapNodeRevision} from "./../../Store/firebase/nodes/@MapNodeRevision";
import {GetNodeRevision} from "./../../Store/firebase/nodeRevisions";

export const conversionTypes = [
	// from normal to...	
	"Normal>Equation",
	// each type back to normal
	"Equation>Normal",
];
export function CanConvertFromClaimTypeXToY(from: ClaimType, to: ClaimType) {
	return conversionTypes.Contains(`${ClaimType[from]}>${ClaimType[to]}`);
}

AddSchema({
	properties: {
		mapID: {type: "number"},
		nodeID: {type: "number"},
		newType: {oneOf: GetValues_ForSchema(ClaimType)},
	},
	required: ["nodeID", "newType"],
}, "ChangeClaimType_payload");

@MapEdit
@UserEdit
export default class ChangeClaimType extends Command<{mapID?: number, nodeID: number, newType: ClaimType}> {
	Validate_Early() {
		AssertValidate("ChangeClaimType_payload", this.payload, `Payload invalid`);
	}

	oldType: ClaimType;
	newData: MapNodeL2;
	newRevision: MapNodeRevision;
	newRevisionID: number;
	async Prepare() {
		let {nodeID, newType} = this.payload;

		//let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		let oldData = await GetAsync_Raw(()=>GetNodeL2(nodeID),);
		this.oldType = GetClaimType(oldData);

		this.newData = {...oldData};
		this.newRevisionID = (await GetDataAsync("general", "lastNodeRevisionID")) + 1;
		this.newRevision = {...oldData.current};

		if (this.oldType == ClaimType.Normal) {
			if (newType == ClaimType.Equation) {
				this.newRevision.equation = new Equation().VSet({text: this.newRevision.titles.base});
				delete this.newRevision.titles;
			}
		} else if (this.oldType == ClaimType.Equation) {
			if (newType == ClaimType.Normal) {
				this.newRevision.titles = {base: this.newRevision.equation.text};
				delete this.newRevision.equation;
			}
		}
	}
	async Validate() {
		let {newType} = this.payload;
		Assert(CanConvertFromClaimTypeXToY(this.oldType, newType), `Cannot convert from claim-type ${ClaimType[this.oldType]} to ${ClaimType[newType]}.`);
		AssertValidate("MapNode", this.newData, `New node-data invalid`);
		AssertValidate("MapNodeRevision", this.newRevisionID, `New revision-data invalid`);
	}
	
	GetDBUpdates() {
		let {nodeID} = this.payload;
		let updates = {};
		updates[`nodes/${nodeID}`] = this.newData;
		updates["general/lastNodeRevisionID"] = this.newRevisionID;
		updates[`nodeRevisions/${this.newRevisionID}`] = this.newRevision;
		return updates;
	}
}