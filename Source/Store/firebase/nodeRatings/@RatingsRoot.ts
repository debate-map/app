export type RatingsRoot = {[key: string]: RatingsSet};
export type RatingsSet = {[key: string]: Rating};
export type Rating = {_key: string, updated: number, value: number};
//export type RatingWithUserID = Rating & {userID: string};