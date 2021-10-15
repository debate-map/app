import {RatingSummary} from "../DB/nodes/@MapNode.js";
import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {GetRatings} from "../DB/nodeRatings.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetRatingTypeInfo, NodeRatingType, RatingValueIsInRange} from "../DB/nodeRatings/@NodeRatingType.js";

@CommandMeta({
	exposeToGraphQL: false, // server-internal
	payloadSchema: ()=>SimpleSchema({}), // not needed
})
export class UpdateNodeRatingSummaries extends Command<{node: string, ratingType: NodeRatingType, ratingsBeingRemoved: string[], ratingsBeingAdded: NodeRating[]}, {}> {
	newData: RatingSummary;
	Validate() {
		const {node, ratingType, ratingsBeingRemoved, ratingsBeingAdded} = this.payload;
		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		const ratings_prior = GetRatings(node, ratingType);
		const ratings_final = ratings_prior.filter(a=>!ratingsBeingRemoved.includes(a.id!)).concat(...ratingsBeingAdded);
		const ratingsInEachRange = ratingTypeInfo.valueRanges.map(range=>{
			return ratings_final.filter(a=>RatingValueIsInRange(a.value, range));
		});
		
		this.newData = new RatingSummary({
			average: ratings_final.length ? ratings_final.map(a=>a.value).Average() : null,
			countsByRange: ratingTypeInfo.valueRanges.map((range, i)=>ratingsInEachRange[i].length),
		});
		AssertValidate(RatingSummary.name, this.newData, "New-data invalid");
	}

	DeclareDBUpdates(db: DBHelper) {
		const {node, ratingType} = this.payload;
		db.set(dbp`nodes/${node}/.extras/.ratingSummaries/.${ratingType}`, this.newData);
	}
}