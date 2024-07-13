import {Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "mobx-graphlink";
import {UserFollow} from "../DB/userHiddens/@UserHidden.js";

@CommandMeta({
	payloadSchema: ()=>SimpleSchema({
		$targetUser: {$ref: "UUID"},
		$userFollow: {$ref: "UserFollow"},
	}),
})
export class SetUserFollowData extends Command<{targetUser: string, userFollow: UserFollow|n}, {}> {
	Validate() {}

	DeclareDBUpdates(db: DBHelper) {
		const {targetUser, userFollow} = this.payload;
		db.set(dbp`userHiddens/${this.userInfo.id}/.extras/.userFollows/.${targetUser}`, userFollow);
	}
}