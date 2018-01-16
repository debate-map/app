import {UserInfo} from "firebase";
export const User_id = "^[a-zA-Z0-9]+$";
export type User = {
	_key?: string;
	avatarUrl: string;
	displayName: string;
	email: string;
	providerData: UserInfo[];

	// custom
	backgroundID?: number;
	backgroundCustom_enabled?: boolean;
	backgroundCustom_url?: string;
	backgroundCustom_position?: string;
};
AddSchema({
	properties: {
		avatarUrl: {type: "string"},
		displayName: {type: "string"},
		email: {type: "string"},
		providerData: {type: "array"},

		// custom
		backgroundID: {type: "number"},
		backgroundCustom_enabled: {type: "boolean"},
		backgroundCustom_url: {type: "string"},
		backgroundCustom_position: {type: "string"},
	}
}, "User");