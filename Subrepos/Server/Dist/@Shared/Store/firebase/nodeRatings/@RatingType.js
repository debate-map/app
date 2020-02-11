import { Range, Assert, ModifyString, CE } from "js-vextensions";
import { AddSchema } from "mobx-firelink";
import { GetDisplayPolarity, GetLinkUnderParent, GetNodeForm, IsMultiPremiseArgument } from "../nodes/$node";
import { Polarity } from "../nodes/@MapNode";
import { MapNodeType } from "../nodes/@MapNodeType";
import { ArgumentType } from "../nodes/@MapNodeRevision";
// export type RatingType = "significance" | "neutrality" | "probability" | "intensity" | "adjustment" | "strength";
// export type RatingType = "significance" | "neutrality" | "probability" | "support" | "adjustment" | "strength";
// export const ratingTypes = ["significance", "neutrality", "probability", "truth", "impact", "strength"];
export const ratingTypes = ["significance", "neutrality", "truth", "relevance", "impact"];
AddSchema("RatingType", {
    oneOf: ratingTypes.map(a => ({ const: a })),
});
export function PropNameToTitle(propName) {
    return ModifyString(propName, m => [m.lowerUpper_to_lowerSpaceLower, m.startLower_to_upper]);
}
export function GetRatingTypeInfo(ratingType, node, parent, path) {
    const link = GetLinkUnderParent(node._key, parent);
    const displayPolarity = link ? GetDisplayPolarity(link.polarity, GetNodeForm(parent)) : Polarity.Supporting;
    const isMultiPremiseArgument = IsMultiPremiseArgument(node);
    const result = new RatingType_Info();
    result.displayText = PropNameToTitle(ratingType);
    result.labels = Range(0, 100);
    result.values = Range(0, 100);
    result.tickInterval = 5;
    if (ratingType == "significance") {
        result.description = "How significant/important is this subject? (0: not worth any time discussing, 100: vital to discuss)";
    }
    else if (ratingType == "neutrality") {
        result.description = "How neutral/impartial is the phrasing of this statement/question? (0: as biased as they come, 100: no bias)";
    } /* else if (ratingType == "probability") {
        //result.description = "Suppose you were as sure as you are right now (of this claim being true, in its basic form), 100 different times (on different topics). How many of those times do you expect you'd be correct?";
        result.description = "Consider how sure you are of this statement being true (in its basic form). If you were this sure 100 times (on a variety of things), how many of those times do you think you'd be correct?";
    } */
    else if (ratingType == "truth") {
        // result.description = "To what degree do you consider this statement true? (0: completely false, 50: true to a basic extent, 100: true to a high extent)";
        result.description = "To what degree do you consider this statement true? (0: completely false, 50: somewhat true, 100: completely true)";
    }
    else if (ratingType == "impact") {
        result.description = "Argument impact is calculated by combining (multiplying) the truth and relevance ratings.";
    }
    else if (ratingType == "relevance") {
        Assert(node.type == MapNodeType.Argument, `Invalid state. Node with rating-type "relevance" should be an argument. @path:${path}`);
        const premiseCountrStrMap = {
            // [ArgumentType.All]: `all of the premises`,
            [ArgumentType.All]: "they",
            [ArgumentType.AnyTwo]: "at least two of them",
            [ArgumentType.Any]: "at least one of them",
        };
        const premiseCountStr = premiseCountrStrMap[node.current.argumentType];
        result.description = isMultiPremiseArgument
            ? `Assuming ${premiseCountStr} were true, how relevant/impactful would the statements (premises) below this be toward the parent claim? (0: not at all, 50: moderately, 100: game-changing)`
            : "Assuming it were true, how relevant/impactful would this statement be toward the parent claim? (0: not at all, 50: moderately, 100: game-changing)";
    }
    else {
        Assert(false, `Invalid rating type: ${ratingType}`);
    }
    return result;
}
export class RatingType_Info {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
