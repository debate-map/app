import {AddSchema} from "vwebapp-framework";
import {ObservableMap} from "mobx";

export type RatingsRoot_ForDBTree = ObservableMap<string, RatingsSet_ForDBTree>; // rating-type (key) -> user-id -> rating -> value
export type RatingsSet_ForDBTree = ObservableMap<string, Rating>; // user-id (key) -> rating -> value

// RatingsRoot instances are constructed dynamically, so keep them as basic map
//export type RatingsRoot = {[key: string]: RatingsSet}; // rating-type (key) -> user-id -> rating -> value
export type RatingsSet = {[key: string]: Rating}; // user-id (key) -> rating -> value
//AddSchema("RatingsSet", {patternProperties: {[User_id]: {$ref: "Rating"}}});

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