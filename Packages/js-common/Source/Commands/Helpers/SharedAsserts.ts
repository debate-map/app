import {Command, AssertV} from "mobx-graphlink";
import {IsUserCreatorOrMod} from "../../DB.js";

/*export function AssertUserCanModify(command: Command<any, any>, entity: {creator?: string}, act = "modify or delete") {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to ${act} this entry.`);
}*/
export function AssertUserCanModify(command: Command<any, any>, entity: {creator?: string}|n) {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to modify this entry.`);
}
export function AssertUserCanDelete(command: Command<any, any>, entity: {creator?: string}|n) {
	AssertV(entity, "Entry does not exist.");
	AssertV(IsUserCreatorOrMod(command.userInfo.id, entity), `You do not have permission to delete this entry.`);
}