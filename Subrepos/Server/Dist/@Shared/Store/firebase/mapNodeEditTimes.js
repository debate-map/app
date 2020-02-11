import { AddSchema, UUID_regex } from "mobx-firelink";
import { GetDoc, StoreAccessor } from "mobx-firelink";
export class NodeEditTimes {
}
AddSchema("NodeEditTimes", {
    patternProperties: { [UUID_regex]: { type: "number" } },
});
export var ChangeType;
(function (ChangeType) {
    ChangeType[ChangeType["Add"] = 10] = "Add";
    ChangeType[ChangeType["Edit"] = 20] = "Edit";
    ChangeType[ChangeType["Remove"] = 30] = "Remove";
})(ChangeType || (ChangeType = {}));
/* export class ChangeInfo {
    type: ChangeType;
    time: number;
} */
const colorMap = {
    [ChangeType.Add]: "0,255,0",
    // [ChangeType.Edit]: "255,255,0",
    [ChangeType.Edit]: "255,255,0",
    [ChangeType.Remove]: "255,0,0",
};
export function GetChangeTypeOutlineColor(changeType) {
    if (changeType == null)
        return null;
    return colorMap[changeType];
}
export const GetMapNodeEditTimes = StoreAccessor(s => (mapID) => {
    return GetDoc({}, a => a.mapNodeEditTimes.get(mapID));
});
