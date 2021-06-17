import {Command, AssertV} from "web-vcore/nm/mobx-graphlink";
import {IsUserCreatorOrMod} from "../../Store";

/*export function AssertUserCanModify(command: Command<any, any>, entity: {creator?: string}, act = "modify or delete") {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to ${act} this entry.`);
}*/
export function AssertUserCanModify(command: Command<any, any>, entity: {creator?: string}) {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to modify this entry.`);
}
export function AssertUserCanDelete(command: Command<any, any>, entity: {creator?: string}) {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to delete this entry.`);
}