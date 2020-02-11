import chroma from "chroma-js";
import { ClaimForm, MapNode, MapNodeL3, Polarity } from "./@MapNode";
export declare enum MapNodeType {
    Category = 10,
    Package = 20,
    MultiChoiceQuestion = 30,
    Claim = 40,
    Argument = 50
}
export declare class MapNodeType_Info {
    static for: {
        [key: string]: MapNodeType_Info;
    };
    private constructor();
    childTypes: MapNodeType[];
    minWidth: number;
    maxWidth: number;
}
export declare function GetNodeColor(node: MapNodeL3, type?: "raw" | "background"): chroma.Color;
export declare function GetMapNodeTypeDisplayName(type: MapNodeType, parentNode: MapNode, parentNodeForm: ClaimForm, polarity: Polarity): "category" | "package" | "multi-choice question" | "claim (in question form)" | "claim" | "supporting argument" | "opposing argument";
