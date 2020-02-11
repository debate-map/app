import { MergeDBUpdates, Command } from "mobx-firelink";
import { GetMap } from "./Store/firebase/maps";
import { IsFunction } from "js-vextensions";
import { GetUser } from "./Store/firebase/users";
export function MapEdit(...args) {
    let mapIDKey = "mapID";
    if (IsFunction(args[0])) {
        ApplyToClass(args[0]);
    }
    else {
        mapIDKey = args[0];
        return ApplyToClass;
    }
    function ApplyToClass(targetClass) {
        /* if (targetClass.prototype instanceof Command_Old) {
            const oldPrepare = targetClass.prototype.Prepare;
            targetClass.prototype.Prepare = async function () {
                await oldPrepare.apply(this);
                const mapID = this.payload[mapIDKey];
                if (mapID) {
                    this.map_oldEditCount = (await GetAsync(() => GetMap(mapID)))?.edits ?? 0;
                }
            };
        } */
        if (targetClass.prototype instanceof Command) {
            const oldValidate = targetClass.prototype.Validate;
            targetClass.prototype.Validate = function () {
                var _a;
                const result = oldValidate.apply(this);
                const mapID = this.payload[mapIDKey];
                if (mapID) {
                    const map = GetMap(mapID);
                    if (map != null) {
                        this.map_oldEditCount = (_a = map.edits, (_a !== null && _a !== void 0 ? _a : 0));
                    }
                }
                return result;
            };
        }
        const oldGetDBUpdates = targetClass.prototype.GetDBUpdates;
        targetClass.prototype.GetDBUpdates = function () {
            const updates = oldGetDBUpdates.apply(this);
            const newUpdates = {};
            if (this.map_oldEditCount != null) {
                const mapID = this.payload[mapIDKey];
                if (mapID) {
                    newUpdates[`maps/${mapID}/.edits`] = this.map_oldEditCount + 1;
                    newUpdates[`maps/${mapID}/.editedAt`] = Date.now();
                }
            }
            return MergeDBUpdates(updates, newUpdates);
        };
    }
}
export function UserEdit(targetClass) {
    /* if (targetClass.prototype instanceof Command_Old) {
        const oldPrepare = targetClass.prototype.Prepare;
        targetClass.prototype.Prepare = async function () {
            await oldPrepare.apply(this);
            this.user_oldEditCount = (await GetAsync(() => GetUserExtraInfo(this.userInfo.id)))?.edits ?? 0;
        };
    } */
    if (targetClass.prototype instanceof Command) {
        const oldValidate = targetClass.prototype.Validate;
        targetClass.prototype.Validate = function () {
            var _a;
            const result = oldValidate.apply(this);
            const user = GetUser(this.userInfo.id);
            if (user) {
                this.user_oldEditCount = (_a = user.edits, (_a !== null && _a !== void 0 ? _a : 0));
            }
            return result;
        };
    }
    const oldGetDBUpdates = targetClass.prototype.GetDBUpdates;
    targetClass.prototype.GetDBUpdates = function () {
        const updates = oldGetDBUpdates.apply(this);
        const newUpdates = {};
        if (this.user_oldEditCount != null) {
            newUpdates[`users/${this.userInfo.id}/.edits`] = this.user_oldEditCount + 1;
            newUpdates[`users/${this.userInfo.id}/.lastEditAt`] = Date.now();
        }
        return MergeDBUpdates(updates, newUpdates);
    };
}
