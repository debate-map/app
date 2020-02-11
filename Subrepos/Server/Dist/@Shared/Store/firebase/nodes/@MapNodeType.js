import chroma from "chroma-js";
import { Assert, CE } from "js-vextensions";
import { Polarity } from "./@MapNode";
export var MapNodeType;
(function (MapNodeType) {
    MapNodeType[MapNodeType["Category"] = 10] = "Category";
    MapNodeType[MapNodeType["Package"] = 20] = "Package";
    MapNodeType[MapNodeType["MultiChoiceQuestion"] = 30] = "MultiChoiceQuestion";
    MapNodeType[MapNodeType["Claim"] = 40] = "Claim";
    MapNodeType[MapNodeType["Argument"] = 50] = "Argument";
})(MapNodeType || (MapNodeType = {}));
export class MapNodeType_Info {
    constructor(initialData) {
        CE(this).VSet(initialData);
    }
}
MapNodeType_Info.for = {
    [MapNodeType.Category]: new MapNodeType_Info({
        childTypes: [MapNodeType.Category, MapNodeType.Package, MapNodeType.MultiChoiceQuestion, MapNodeType.Claim],
        minWidth: 100, maxWidth: 250,
    }),
    [MapNodeType.Package]: new MapNodeType_Info({
        childTypes: [MapNodeType.Claim],
        minWidth: 100, maxWidth: 250,
    }),
    [MapNodeType.MultiChoiceQuestion]: new MapNodeType_Info({
        childTypes: [MapNodeType.Claim],
        minWidth: 100, maxWidth: 250,
    }),
    [MapNodeType.Claim]: new MapNodeType_Info({
        childTypes: [MapNodeType.Argument],
        minWidth: 350, maxWidth: 550,
    }),
    [MapNodeType.Argument]: new MapNodeType_Info({
        childTypes: [MapNodeType.Claim, MapNodeType.Argument],
        minWidth: 100, maxWidth: 300,
    }),
};
export function GetNodeColor(node, type = "background") {
    let result;
    if (node.type == MapNodeType.Category)
        result = chroma("rgb(40,60,80)");
    else if (node.type == MapNodeType.Package)
        result = chroma("rgb(30,120,150)");
    else if (node.type == MapNodeType.MultiChoiceQuestion)
        result = chroma("rgb(90,50,180)");
    else if (node.type == MapNodeType.Claim)
        result = chroma("rgb(0,80,150)");
    else if (node.type == MapNodeType.Argument) {
        if (node.displayPolarity == Polarity.Supporting)
            result = chroma("rgb(30,100,30)");
        else
            result = chroma("rgb(100,30,30)");
    }
    if (type == "background") {
        result = chroma.mix(result, "black", 0.3); // mix background-color with black some
        result = result.alpha(0.9);
    }
    return result;
}
export function GetMapNodeTypeDisplayName(type, parentNode, parentNodeForm, polarity) {
    if (type == MapNodeType.Category)
        return "category";
    if (type == MapNodeType.Package)
        return "package";
    if (type == MapNodeType.MultiChoiceQuestion)
        return "multi-choice question";
    if (type == MapNodeType.Claim) {
        if (parentNode && parentNode.type == MapNodeType.Category) {
            return "claim (in question form)";
        }
        return "claim";
    }
    if (type == MapNodeType.Argument) {
        return polarity == Polarity.Supporting ? "supporting argument" : "opposing argument";
    }
    Assert(false, "Invalid node type.");
}
