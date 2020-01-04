import {AddSchema} from "vwebapp-framework";

// temp replaced
// import {UserInfo as ProviderData} from "firebase";
type ProviderData = any;

export class User_Private {
	_key?: string;
	//displayName: string;
	//avatarUrl: string;
	email: string;
	providerData: ProviderData[];

	// custom
	backgroundID?: string;
	backgroundCustom_enabled?: boolean;
	backgroundCustom_color?: string;
	backgroundCustom_url?: string;
	backgroundCustom_position?: string;
}
AddSchema("User_Private", {
	properties: {
		//displayName: {type: "string"},
		//avatarUrl: {type: "string"},
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