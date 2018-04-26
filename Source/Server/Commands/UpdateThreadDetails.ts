import { Thread } from "firebase-forum";
import { GetDataAsync } from "../../Frame/Database/DatabaseHelpers";
import { Command } from "../Command";
import { UserEdit } from "../CommandMacros";

AddSchema({
	properties: {
		threadID: {type: "number"},
		threadUpdates: Schema({
			properties: {
				title: {type: "string"},
			},
		}),
	},
	required: ["threadID", "threadUpdates"],
}, "UpdateThreadDetails_payload");

@UserEdit
export default class UpdateThreadDetails extends Command<{threadID: number, threadUpdates: Partial<Thread>}> {
	Validate_Early() {
		AssertValidate("UpdateThreadDetails_payload", this.payload, `Payload invalid`);
	}

	oldData: Thread;
	newData: Thread;
	async Prepare() {
		let {threadID, threadUpdates} = this.payload;
		this.oldData = await GetDataAsync({addHelpers: false}, "forum", "threads", threadID) as Thread;
		this.newData = {...this.oldData, ...threadUpdates};
	}
	async Validate() {
		AssertValidate("Thread", this.newData, `New thread-data invalid`);
	}
	
	GetDBUpdates() {
		let {threadID, threadUpdates} = this.payload;
		let updates = {};
		updates[`forum/threads/${threadID}`] = this.newData;
		return updates;
	}
}