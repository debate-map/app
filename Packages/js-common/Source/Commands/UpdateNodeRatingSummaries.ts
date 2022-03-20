import {AssertValidate, Command, CommandMeta, DBHelper, dbp, SimpleSchema} from "web-vcore/nm/mobx-graphlink.js";
import {MapNode, RatingSummary} from "../DB/nodes/@MapNode.js";
import {GetRatings} from "../DB/nodeRatings.js";
import {NodeRating} from "../DB/nodeRatings/@NodeRating.js";
import {GetRatingTypeInfo, NodeRatingType, RatingValueIsInRange} from "../DB/nodeRatings/@NodeRatingType.js";
import {GetArgumentImpactPseudoRating, GetArgumentImpactPseudoRatings, RatingListAfterRemovesAndAdds} from "../Utils/DB/RatingProcessor.js";
import {MapNodeType} from "../DB/nodes/@MapNodeType.js";
import {GetNode, GetNodeChildren, GetNodeChildrenL2, GetNodeParents} from "../DB/nodes.js";
import {GetArgumentNode} from "../DB/nodes/$node.js";

@CommandMeta({
	exposeToGraphQL: false, // server-internal
	payloadSchema: ()=>SimpleSchema({
		nodeID: {$ref: "UUID"},
		ratingType: {$ref: "NodeRatingType"},
		ratingsBeingRemoved: {items: {type: "string"}},
		ratingsBeingAdded: {items: {$ref: NodeRating.name}},
	}),
})
export class UpdateNodeRatingSummaries extends Command<{nodeID: string, ratingType: NodeRatingType, ratingsBeingRemoved: string[], ratingsBeingAdded: NodeRating[]}, {}> {
	newSummary: RatingSummary;
	newArgumentImpactSummaries: Map<string, RatingSummary>;
	Validate() {
		const {nodeID, ratingType, ratingsBeingRemoved, ratingsBeingAdded} = this.payload;
		const ratingTypeInfo = GetRatingTypeInfo(ratingType);
		const ratings_prior = GetRatings(nodeID, ratingType);
		const ratings_final = ratings_prior.filter(a=>!ratingsBeingRemoved.includes(a.id!)).concat(...ratingsBeingAdded);
		const ratingsInEachRange = ratingTypeInfo.valueRanges.map(range=>{
			return ratings_final.filter(a=>RatingValueIsInRange(a.value, range));
		});

		this.newSummary = new RatingSummary({
			average: ratings_final.length ? ratings_final.map(a=>a.value).Average() : null,
			countsByRange: ratingTypeInfo.valueRanges.map((range, i)=>ratingsInEachRange[i].length),
		});
		AssertValidate(RatingSummary.name, this.newSummary, "New-data invalid");

		this.newArgumentImpactSummaries = new Map();
		const argumentNodes =
			ratingType == NodeRatingType.relevance ? [GetNode.NN(nodeID)] :
			ratingType == NodeRatingType.truth ? (GetNodeParents(nodeID) as MapNode[]).filter(a=>a.type == MapNodeType.argument) :
			[];
		for (const argument of argumentNodes) {
			const premises = GetNodeChildren(argument.id).filter(a=>a.type == MapNodeType.claim);
			const ratingTypeInfo_impact = GetRatingTypeInfo(NodeRatingType.impact);
			const ratings_impact = GetArgumentImpactPseudoRatings(argument, premises, null, false, ratingsBeingRemoved, ratingsBeingAdded);
			const ratings_impact_inEachRange = ratingTypeInfo_impact.valueRanges.map(range=>{
				return ratings_impact.filter(a=>RatingValueIsInRange(a.value, range));
			});
			//const average_forUsersRatingAll = ratings_impact.length ? ratings_impact.map(a=>a.value).Average() : null;

			// For the "impact" rating-type, we calculate the "average" a bit differently than normal.
			// Rather than a pure average of the "impact" pseudo-ratings, we use: [average of argument's relevance] * [average of premise-1's truth] * [...]
			// Why? Because the "impact" pseudo-ratings exclude users that only rated one of the above rating-groups; this alternate approach utilizes all the ratings.
			const argumentRelevanceRatings = RatingListAfterRemovesAndAdds(GetRatings(argument.id, NodeRatingType.relevance), ratingsBeingRemoved, ratingsBeingAdded, {nodeID: argument.id, ratingType: NodeRatingType.relevance});
			const premiseTruthRatingSets = premises.map(premise=>RatingListAfterRemovesAndAdds(GetRatings(premise.id, NodeRatingType.truth), ratingsBeingRemoved, ratingsBeingAdded, {nodeID: premise.id, ratingType: NodeRatingType.truth}));
			const ratingValueSets = [argumentRelevanceRatings.map(rating=>rating.value), ...premiseTruthRatingSets.map(set=>set.map(rating=>rating.value))];
			const ratingValueSets_multiplied = ratingValueSets.reduce((result, set)=>{
				if (set.length == 0) return 0; // if there are no ratings in this set, then we can't calculate an overall score, so have it become 0
				return result * (set.Average() / 100); // else, there is a valid average for this set, so do the multiplication like normal
			}, 1);
			const average_loose = ratingValueSets_multiplied * 100;

			const newImpactSummary = new RatingSummary({
				average: average_loose,
				countsByRange: ratingTypeInfo_impact.valueRanges.map((range, i)=>ratings_impact_inEachRange[i].length),
			});
			AssertValidate(RatingSummary.name, newImpactSummary, "New impact-rating summary invalid");
			this.newArgumentImpactSummaries.set(argument.id, newImpactSummary);
		}
	}

	DeclareDBUpdates(db: DBHelper) {
		const {nodeID, ratingType} = this.payload;
		db.set(dbp`nodes/${nodeID}/.extras/.ratingSummaries/.${ratingType}`, this.newSummary);
		if (this.newArgumentImpactSummaries?.size) {
			for (const [argumentID, ratingSummary] of this.newArgumentImpactSummaries) {
				db.set(dbp`nodes/${argumentID}/.extras/.ratingSummaries/.${NodeRatingType.impact}`, ratingSummary);
			}
		}
	}
}