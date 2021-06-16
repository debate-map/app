import {AddSchema} from "../../../../Commands/node_modules/mobx-firelink";
import {ObservableMap} from "web-vcore/nm/mobx";
import {CE} from "../../../../Commands/node_modules/js-vextensions";
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