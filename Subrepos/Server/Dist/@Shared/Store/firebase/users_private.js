import { GetDoc, StoreAccessor } from "mobx-firelink";
export const GetUser_Private = StoreAccessor(s => (userID) => {
    return GetDoc({}, a => a.users_private.get(userID));
});
