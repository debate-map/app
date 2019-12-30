import {AddSchema} from "vwebapp-framework";

// temp replaced
// import {UserInfo} from "firebase";
type UserInfo = any;

export const User_id = "^[a-zA-Z0-9]+$";
export type User = {
	_key?: string;
	avatarUrl: string;
	displayName: string;
	email: string;
	providerData: UserInfo[];

	// custom
	backgroundID?: string;
	backgroundCustom_enabled?: boolean;
	backgroundCustom_color?: string;
	backgroundCustom_url?: string;
	backgroundCustom_position?: string;
};
AddSchema("User", {
	properties: {
		avatarUrl: {type: "string"},
		displayName: {type: "string"},
		email: {type: "string"},
		providerData: {type: "array"},

		// custom
		backgroundID: {type: "string"},
		backgroundCustom_enabled: {type: "boolean"},
		backgroundCustom_color: {type: ["null", "string"]},
		backgroundCustom_url: {type: "string"},
		backgroundCustom_position: {type: "string"},
	},
});