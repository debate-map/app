import { RatingType } from "./@RatingType";
export declare class Rating {
    constructor(initialData: Partial<Rating> & Pick<Rating, "node" | "type" | "user" | "value">);
    _key?: string;
    node: string;
    type: RatingType;
    user: string;
    updated: number;
    value: number;
}
