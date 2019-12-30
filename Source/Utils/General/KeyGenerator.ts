// import uuidV4 from 'uuid/v4';
import slugid from "slugid";
import {AddSchema} from "vwebapp-framework";

export type UUID = string; // just an alias
export const UUID_regex_partial = "[A-Za-z0-9_-]{22}";
export const UUID_regex = `^${UUID_regex_partial}$`;
AddSchema("UUID", {type: "string", pattern: UUID_regex});

export function GenerateUUID(): string {
	// return uuidV4(options);
	return slugid.v4();
}