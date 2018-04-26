import { UserEdit } from "Server/CommandMacros";
import { Section } from "firebase-forum";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Command } from "../Command";

@UserEdit
export default class AddSection extends Command<{section: Section}> {
	sectionID: number;
	oldSectionOrder: number[];
	async Prepare() {
		let {section} = this.payload;
		let firebase = store.firebase.helpers;

		let lastSectionID = await GetDataAsync("forum", "general", "lastSectionID") as number;
		this.sectionID = lastSectionID + 1;

		this.oldSectionOrder = await GetDataAsync("forum", "general", "sectionOrder") || [];

		this.returnData = this.sectionID;
	}
	async Validate() {
		let {section} = this.payload;
		AssertValidate(`Section`, section, `Section invalid`);
	}
	
	GetDBUpdates() {
		let {section} = this.payload;

		let updates = {};
		// add section
		updates["forum/general/lastSectionID"] = this.sectionID;
		updates["forum/general/sectionOrder"] = this.oldSectionOrder.concat(this.sectionID);
		updates[`forum/sections/${this.sectionID}`] = section;

		return updates;
	}
}