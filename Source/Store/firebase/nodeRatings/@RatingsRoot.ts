import {AddSchema} from "vwebapp-framework";
import {ObservableMap} from "mobx";
import {User_id} from "../users/@User";

export type RatingsRoot = ObservableMap<string, RatingsSet>; // rating-type (key) -> user-id -> rating -> value
export type RatingsSet = ObservableMap<string, Rating>; // user-id (key) -> rating -> value
AddSchema("RatingsSet", {patternProperties: {[User_id]: {$ref: "Rating"}}});

export class Rating {
	constructor(value: number) {
		this.updated = Date.now();
		this.value = value;
	}
	_key: string;
	updated: number;
	value: number;
}
AddSchema("Rating", {
	properties: {
		updated: {type: "number"},
		value: {type: "number"},
	},
	required: ["updated", "value"],
});
// export type RatingWithUserID = Rating & {userID: string};