import {Assert} from "js-vextensions";
import {GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Command} from "../Command";
import {MapNode, ClaimForm, ChildEntry, AccessLevel} from "../../Store/firebase/nodes/@MapNode";
import {E} from "../../Frame/General/Others";
import {GetValues_ForSchema} from "../../Frame/General/Enums";
import {Map_namePattern, Map} from "../../Store/firebase/maps/@Map";
import {UserEdit} from "../CommandMacros";
import {MapEdit} from "Server/CommandMacros";
import {Subforum, Subforum_nameFormat} from "firebase-forum";
import {WaitTillSchemaAddedThenRun, GetSchemaJSON} from "../Server";
import {GetLinkUnderParent} from "../../Store/firebase/nodes/$node";
import {GetNode} from "Store/firebase/nodes";
import {GetAsync, GetAsync_Raw} from "Frame/Database/DatabaseHelpers";

WaitTillSchemaAddedThenRun("ChildEntry", ()=> {
	AddSchema({
		properties: {
			linkParentID: {type: "number"},
			linkChildID: {type: "number"},
			linkUpdates: GetSchemaJSON("ChildEntry").Including("form", "polarity"),
		},
		required: ["linkParentID", "linkChildID", "linkUpdates"],
	}, "UpdateLink_payload");
});

@UserEdit
export default class UpdateLink extends Command<{linkParentID: number, linkChildID: number, linkUpdates: Partial<ChildEntry>}> {
	Validate_Early() {
		AssertValidate("UpdateLink_payload", this.payload, `Payload invalid`);
	}

	newData: ChildEntry;
	async Prepare() {
		let {linkParentID, linkChildID, linkUpdates} = this.payload;
		let parent = await GetAsync_Raw(()=>GetNode(linkParentID));
		let oldData = GetLinkUnderParent(linkChildID, parent);
		this.newData = {...oldData, ...linkUpdates};
	}
	async Validate() {
		AssertValidate("ChildEntry", this.newData, `New link-data invalid`);
	}
	
	GetDBUpdates() {
		let {linkParentID, linkChildID} = this.payload;
		let updates = {};
		updates[`nodes/${linkParentID}/children/${linkChildID}`] = this.newData;
		return updates;
	}
}