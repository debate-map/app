import {GetValues_ForSchema, CE} from "web-vcore/nm/js-vextensions";
import {AssertV, AV, Command} from "web-vcore/nm/mobx-graphlink";
import {MapEdit, UserEdit} from "../CommandMacros";
import {AddSchema, AssertValidate, GenerateUUID} from "web-vcore/nm/mobx-graphlink";
import {AttachmentType, GetAttachmentType} from "../Store/firebase/nodeRevisions/@AttachmentType";
import {MapNode} from "../Store/firebase/nodes/@MapNode";
import {MapNodeRevision} from "../Store/firebase/nodes/@MapNodeRevision";
import {GetNodeL2, AsNodeL1} from "../Store/firebase/nodes/$node";
import {EquationAttachment} from "../Store/firebase/nodeRevisions/@EquationAttachment";

export const conversionTypes = [
	// from normal to...
	"Normal>Equation",
	// each type back to normal
	"Equation>Normal",
];
export function CanConvertFromClaimTypeXToY(from: AttachmentType, to: AttachmentType) {
	return conversionTypes.includes(`${AttachmentType[from]}>${AttachmentType[to]}`);
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
	newData: MapNode;
	newRevision: MapNodeRevision;
	newRevisionID: string;
	Validate() {
		AssertValidate("ChangeClaimType_payload", this.payload, "Payload invalid");
		const {nodeID, newType} = this.payload;
		// let oldData = await GetDataAsync({addHelpers: false}, "nodes", nodeID) as MapNode;
		const oldData = AV.NonNull = GetNodeL2(nodeID);
		this.oldType = GetAttachmentType(oldData);

		this.newData = {...AsNodeL1(oldData)};
		// this.newRevisionID = (await GetDataAsync('general', 'data', '.lastNodeRevisionID')) + 1;
		this.newRevisionID = this.newRevisionID ?? GenerateUUID();
		this.newRevision = {...oldData.current};
		this.newData.currentRevision = this.newRevisionID;

		if (this.oldType == AttachmentType.None) {
			if (newType == AttachmentType.Equation) {
				this.newRevision.equation = CE(new EquationAttachment()).VSet({text: this.newRevision.titles.base});
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