import { MapNodeL2, MapNodeL3 } from "../nodes/@MapNode";
export declare const ratingTypes: string[];
export declare type RatingType = "significance" | "neutrality" | "truth" | "relevance" | "impact";
export declare function PropNameToTitle(propName: string): string;
export declare function GetRatingTypeInfo(ratingType: RatingType, node: MapNodeL2, parent: MapNodeL3, path: string): RatingType_Info;
export declare type JSX_Element = any;
export declare class RatingType_Info {
    constructor(initialData?: Partial<RatingType_Info>);
    displayText: string;
    description: string | ((..._: any[]) => JSX_Element);
    labels: number[];
    values: number[];
    tickInterval: number;
    tickRender?: (props: TickRenderProps) => JSX_Element;
}
declare type TickRenderProps = {
    fill: string;
    height: number;
    index: number;
    payload: any;
    stroke: string;
    textAnchor: string;
    verticalAnchor: string;
    viewBox: any;
    width: number;
    x: number;
    y: number;
};
export {};
