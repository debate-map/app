import chroma from "web-vcore/nm/chroma-js.js";
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
	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	//displayName: string;
	//avatarUrl: string;

	@DB((t, n)=>t.text(n))
	@Field({type: "string"})
	email: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({type: "array"})
	providerData: ProviderData[];

	// background
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

	// others
	// ==========

	@DB((t, n)=>t.boolean(n))
	@Field({type: "boolean"})
	addToStream = true;

	@DB((t, n)=>t.string(n).nullable().references("id").inTable(`accessPolicies`).DeferRef())
	@Field({$ref: "UUID"}, {opt: true})
	lastAccessPolicy?: string;

	@DB((t, n)=>t.jsonb(n))
	@Field({$ref: "UserHidden_Extras"})
	extras: UserHidden_Extras;
}

@MGLClass()
export class UserHidden_Extras {
	constructor(data?: Partial<UserHidden_Extras>) {
		this.VSet(data);
	}

	@Field({patternProperties: {".{22}": {$ref: "UserFollow"}}})
	userFollows = {} as {[key: string]: UserFollow};
}
@MGLClass()
export class UserFollow {
	@Field({type: "boolean"})
	markRatings = true;
	
	@Field({type: "string"})
	markRatings_symbol = "X";
	
	@Field({type: "string"})
	markRatings_color = chroma("yellow").css();
	
	@Field({type: "number"})
	markRatings_size = 10;
}