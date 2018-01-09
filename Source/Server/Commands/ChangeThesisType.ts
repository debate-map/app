import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ThesisForm, ChildEntry, ThesisType} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Globals_Free";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {GetThesisType} from "../../Store/firebase/nodes/$node";
import {Equation} from "../../Store/firebase/nodes/@Equation";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {GetAsync_Raw} from "Frame/Database/DatabaseHelpers";
import {GetNode} from "Store/firebase/nodes";

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
	newData: MapNode;
	async Prepare() {
		let {nodeID, newType} = this.payload;

		//let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		let oldData = await GetAsync_Raw(()=>GetNode(nodeID),);
		this.oldType = GetThesisType(oldData);

		this.newData = {...oldData};
		if (this.oldType == ThesisType.Normal) {
			if (newType == ThesisType.Equation) {
				this.newData.equation = new Equation().VSet({text: this.newData.titles.base});
				delete this.newData.titles;
			}
		} else if (this.oldType == ThesisType.Equation) {
			if (newType == ThesisType.Normal) {
				this.newData.titles = {base: this.newData.equation.text};
				delete this.newData.equation;
			}
		}
	}
	async Validate() {
		let {newType} = this.payload;
		Assert(CanConvertFromThesisTypeXToY(this.oldType, newType), `Cannot convert from thesis-type ${ThesisType[this.oldType]} to ${ThesisType[newType]}.`);
		AssertValidate("MapNode", this.newData, `New node-data invalid`);
	}
	
	GetDBUpdates() {
		let {nodeID} = this.payload;
		let updates = {};
		updates[`nodes/${nodeID}`] = this.newData;
		return updates;
	}
}