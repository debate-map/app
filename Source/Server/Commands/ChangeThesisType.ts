import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, ThesisType, MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {GetThesisType, GetNodeL2} from "../../Store/firebase/nodes/$node";
import {Equation} from "../../Store/firebase/nodes/@Equation";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetNode} from "Store/firebase/nodes";
import {MapNodeRevision} from "../../Store/firebase/nodes/@MapNodeRevision";
import {GetNodeRevision} from "../../Store/firebase/nodeRevisions";

export const conversionTypes = [
	// from normal to...	
	"Normal>Equation",
	// each type back to normal
	"Equation>Normal",
];
export function CanConvertFromThesisTypeXToY(from: ThesisType, to: ThesisType) {
	return conversionTypes.Contains(`${ThesisType[from]}>${ThesisType[to]}`);
}

AddSchema({
	properties: {
		mapID: {type: "number"},
		nodeID: {type: "number"},
		newType: {oneOf: GetValues_ForSchema(ThesisType)},
	},
	required: ["nodeID", "newType"],
}, "ChangeThesisType_payload");

@MapEdit
@UserEdit
export default class ChangeThesisType extends Command<{mapID?: number, nodeID: number, newType: ThesisType}> {
	Validate_Early() {
		AssertValidate("ChangeThesisType_payload", this.payload, `Payload invalid`);
	}

	oldType: ThesisType;
	newData: MapNodeL2;
	newRevision: MapNodeRevision;
	newRevisionID: number;
	async Prepare() {
		let {nodeID, newType} = this.payload;

		//let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		let oldData = await GetAsync_Raw(()=>GetNodeL2(nodeID),);
		this.oldType = GetThesisType(oldData);

		this.newData = {...oldData};
		this.newRevisionID = (await GetDataAsync("general", "lastNodeRevisionID")) + 1;
		this.newRevision = {...oldData.current};

		if (this.oldType == ThesisType.Normal) {
			if (newType == ThesisType.Equation) {
				this.newRevision.equation = new Equation().VSet({text: this.newRevision.titles.base});
				delete this.newRevision.titles;
			}
		} else if (this.oldType == ThesisType.Equation) {
			if (newType == ThesisType.Normal) {
				this.newRevision.titles = {base: this.newRevision.equation.text};
				delete this.newRevision.equation;
			}
		}
	}
	async Validate() {
		let {newType} = this.payload;
		Assert(CanConvertFromThesisTypeXToY(this.oldType, newType), `Cannot convert from thesis-type ${ThesisType[this.oldType]} to ${ThesisType[newType]}.`);
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