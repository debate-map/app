import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink.js";

// temp replaced
// import {UserInfo as ProviderData} from "firebase";
type ProviderData = any;

@MGLClass({table: "userHiddens"})
export class UserHidden {
	constructor(data?: Partial<UserHidden>) {
		this.VSet(data);
	}

	@DB((t, n)=>t.text(n).primary())
	@Field({$ref: "UUID"}, {opt: true}) // optional during creation
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

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	backgroundID?: string|n;

	@DB((t, n)=>t.boolean(n).nullable())
	@Field({type: "boolean"}, {opt: true})
	backgroundCustom_enabled?: boolean|n;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: ["null", "string"]}, {opt: true})
	backgroundCustom_color?: string|n;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	backgroundCustom_url?: string|n;

	@DB((t, n)=>t.text(n).nullable())
	@Field({type: "string"}, {opt: true})
	backgroundCustom_position?: string|n;
}