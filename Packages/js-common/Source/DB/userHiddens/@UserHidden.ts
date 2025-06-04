import chroma from "chroma-js";
import {AddSchema, Field, MGLClass} from "mobx-graphlink";

// temp replaced
// import {UserInfo as ProviderData} from "firebase";
type ProviderData = any;

@MGLClass({table: "userHiddens"})
export class UserHidden {
	constructor(data?: Partial<UserHidden>) {
		Object.assign(this, data);
	}

	@Field({$ref: "UUID"}, {opt: true})
	id: string;

	//displayName: string;
	//avatarUrl: string;

	@Field({type: "string"})
	email: string;

	@Field({type: "array"})
	providerData: ProviderData[];

	// background
	// ==========

	@Field({type: "string"}, {opt: true})
	backgroundID?: string|n;

	@Field({type: "boolean"}, {opt: true})
	backgroundCustom_enabled?: boolean|n;

	@Field({type: ["null", "string"]}, {opt: true})
	backgroundCustom_color?: string|n;

	@Field({type: "string"}, {opt: true})
	backgroundCustom_url?: string|n;

	@Field({type: "string"}, {opt: true})
	backgroundCustom_position?: string|n;

	@Field({type: "string"})
	notificationPolicy: string;

	// others
	// ==========

	@Field({type: "boolean"})
	addToStream = true;

	@Field({$ref: "UUID"}, {opt: true})
	lastAccessPolicy?: string;

	//@Field({$ref: "UserHidden_Extras"})
	@Field({type: "object"})
	extras = new UserHidden_Extras();

}

@MGLClass({}, {additionalProperties: true})
export class UserHidden_Extras {
	constructor(data?: Partial<UserHidden_Extras>) {
		Object.assign(this, data);
	}

	@Field({
		$gqlType: "JSON", // graphql doesn't support key-value-pair structures, so just mark as JSON
		patternProperties: {".{22}": {$ref: "UserFollow"}},
	}, {opt: true})
	userFollows? = {} as {[key: string]: UserFollow};

	//@Field(...)
	defaultAccessPolicy_nodeRatings?: string;
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