import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

// temp replaced
// import {UserInfo as ProviderData} from "firebase";
type ProviderData = any;

//@MGLClass({table: "users_private"})
@MGLClass({table: "usersPrivates"})
export class User_Private {
	constructor(data?: Partial<User_Private>) {
		this.VSet(data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	//displayName: string;
	//avatarUrl: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	email: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({type: "array"})
	providerData: ProviderData[];

	// custom
	// ==========

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	backgroundID?: string|n;

	@DB((t, n)=>t.boolean(n))
	@Field({type: "boolean"})
	backgroundCustom_enabled?: boolean|n;

	@DB((t, n)=>t.text(n))
	@Field({type: ["null", "string"]})
	backgroundCustom_color?: string|n;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	backgroundCustom_url?: string|n;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	backgroundCustom_position?: string|n;
}