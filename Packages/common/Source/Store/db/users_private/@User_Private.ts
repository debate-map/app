import {AddSchema, DB, Field, MGLClass} from "web-vcore/nm/mobx-graphlink";

// temp replaced
// import {UserInfo as ProviderData} from "firebase";
type ProviderData = any;

@MGLClass({table: "users_private"})
export class User_Private {
	@DB((t,n)=>t.text(n).primary())
	@Field({type: "string"})
	id: string;

	//displayName: string;
	//avatarUrl: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	email: string;

	@DB((t,n)=>t.jsonb(n))
	@Field({type: "array"})
	providerData: ProviderData[];

	// custom
	// ==========
	
	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	backgroundID?: string;

	@DB((t,n)=>t.boolean(n))
	@Field({type: "boolean"})
	backgroundCustom_enabled?: boolean;

	@DB((t,n)=>t.text(n))
	@Field({type: ["null", "string"]})
	backgroundCustom_color?: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	backgroundCustom_url?: string;

	@DB((t,n)=>t.text(n))
	@Field({type: "string"})
	backgroundCustom_position?: string;
}