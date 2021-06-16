import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {IsUserCreatorOrMod} from "../../Commands";

export function AssertExistsAndUserIsCreatorOrMod(command: Command<any, any>, entity: {creator?: string}, act = "modify or delete") {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to ${act} this entry.`);
}