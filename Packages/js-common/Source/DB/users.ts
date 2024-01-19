import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {User} from "./users/@User.js";

export const MeID = CreateAccessor({ctx: 1}, function(): string|n {
	return this.graph.userInfo?.id;
});
export const Me = CreateAccessor(()=>{
	const id = MeID();
	if (id == null) return null;
	return GetUser(id);
});

export const GetUser = CreateAccessor((userID: string|n): User|n=>{
	return GetDoc({}, a=>a.users.get(userID!));
});
export const GetUsers = CreateAccessor((): User[]=>{
	return GetDocs({}, a=>a.users);
});

export const GetUserReputation_Approvals = CreateAccessor((userID: string|n)=>{
	return 0;
});
export const GetUserReputation_ApprovalPercent = CreateAccessor((userID: string|n)=>{
	return 0;
});