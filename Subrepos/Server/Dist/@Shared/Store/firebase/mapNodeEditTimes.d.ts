export declare class NodeEditTimes {
    [key: string]: number;
}
export declare enum ChangeType {
    Add = 10,
    Edit = 20,
    Remove = 30
}
export declare function GetChangeTypeOutlineColor(changeType: ChangeType): string;
export declare const GetMapNodeEditTimes: ((mapID: string) => NodeEditTimes) & {
    Wait: (mapID: string) => NodeEditTimes;
};
