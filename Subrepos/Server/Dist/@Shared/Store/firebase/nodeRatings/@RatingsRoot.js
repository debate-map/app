import { AddSchema } from "mobx-firelink";
//AddSchema("RatingsSet", {patternProperties: {[User_id]: {$ref: "Rating"}}});
export class Rating {
    constructor(value) {
        this.updated = Date.now();
        this.value = value;
    }
}
AddSchema("Rating", {
    properties: {
        updated: { type: "number" },
        value: { type: "number" },
    },
    required: ["updated", "value"],
});
// export type RatingWithUserID = Rating & {userID: string};
