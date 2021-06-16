import {AddSchema} from "web-vcore/nm/mobx-graphlink";
import {ObservableMap} from "web-vcore/nm/mobx";
import {CE} from "web-vcore/nm/js-vextensions";
import {RatingType} from "./@RatingType";

export class Rating {
	constructor(initialData: Partial<Rating> & Pick<Rating, "node" | "type" | "user" | "value">) {
		CE(this).VSet(initialData);
	}
	_key?: string;
	node: string;
	type: RatingType;
	user: string;

	updated: number;
	value: number;
}
AddSchema("Rating", {
	properties: {
		node: {type: "string"},
		type: {$ref: "RatingType"},
		user: {type: "string"},

		updated: {type: "number"},
		value: {type: "number"},
	},
	required: ["node", "type", "user", "value"],
});