import {User_id} from "../users/@User";

export type RatingsRoot = {[key: string]: RatingsSet}; // rating-type (key) -> user-id -> rating -> value
export type RatingsSet = {[key: string]: Rating}; // user-id (key) -> rating -> value
AddSchema({patternProperties: {[User_id]: {$ref: "Rating"}}}, "RatingsSet");
export type Rating = {_key: string, updated: number, value: number};
AddSchema({
	properties: {
		updated: {type: "number"},
		value: {type: "number"},
	},
	required: ["updated", "value"],
}, "Rating");
//export type RatingWithUserID = Rating & {userID: string};