import {GetValues_ForSchema} from "js-vextensions";
import {AssertV, Command} from "mobx-firelink";
import {MapEdit, UserEdit} from "Server/CommandMacros";
import {AttachmentType, GetAttachmentType} from "Store/firebase/nodeRevisions/@AttachmentType";
import {GenerateUUID} from "Utils/General/KeyGenerator";
import {AddSchema, AssertValidate} from "vwebapp-framework";
import {GetNodeL2} from "../../Store/firebase/nodes/$node";
import {EquationAttachment} from "../../Store/firebase/nodeRevisions/@EquationAttachment";
import {MapNodeL2} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "../../Store/firebase/nodes/@MapNodeRevision";

export const conversionTypes = [
	// from normal to...
	"Normal>Equation",
	// each type back to normal
	"Equation>Normal",
];
export function CanConvertFromClaimTypeXToY(from: AttachmentType, to: AttachmentType) {
	return conversionTypes.Contains(`${AttachmentType[from]}>${AttachmentType[to]}`);
}

AddSchema("ChangeClaimType_payload", {
	properties: {
		mapID: {type: "string"},
		nodeID: {type: "string"},
		newType: {oneOf: GetValues_ForSchema(AttachmentType)},
	},
	required: ["nodeID", "newType"],
});

@MapEdit
@UserEdit
export class ChangeClaimType extends Command<{mapID?: string, nodeID: string, newType: AttachmentType}, {}> {
	oldType: AttachmentType;
	newData: MapNodeL2;
	newRevision: MapNodeRevision;
	newRevisionID: string;
	Validate() {
		AssertValidate("ChangeClaimType_payload", this.payload, "Payload invalid");
		const {nodeID, newType} = this.payload;
		// let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		const oldData = GetNodeL2(nodeID);
		AssertV(oldData, "oldData is null.");
		this.oldType = GetAttachmentType(oldData);

		this.newData = {...oldData.Excluding("current") as any};
		// this.newRevisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + 1;
		this.newRevisionID = this.newRevisionID ?? GenerateUUID();
		this.newRevision = {...oldData.current};
		this.newData.currentRevision = this.newRevisionID;

		if (this.oldType == AttachmentType.None) {
			if (newType == AttachmentType.Equation) {
				this.newRevision.equation = new EquationAttachment().VSet({text: this.newRevision.titles.base});
				delete this.newRevision.titles;
			}
		} else if (this.oldType == AttachmentType.Equation) {
			if (newType == AttachmentType.None) {
				this.newRevision.titles = {base: this.newRevision.equation.text};
				delete this.newRevision.equation;
			}
		}
		AssertV(CanConvertFromClaimTypeXToY(this.oldType, newType), `Cannot convert from claim-type ${AttachmentType[this.oldType]} to ${AttachmentType[newType]}.`);
		AssertValidate("MapNode", this.newData, "New node-data invalid");
		AssertValidate("MapNodeRevision", this.newRevisionID, "New revision-data invalid");
	}

	GetDBUpdates() {
		const {nodeID} = this.payload;
		const updates = {};
		updates[`nodes/${nodeID}`] = this.newData;
		// updates['general/data/.lastNodeRevisionID'] = this.newRevisionID;
		updates[`nodeRevisions/${this.newRevisionID}`] = this.newRevision;
		return updates;
	}
}