// import { Subforum, Post, Thread } from 'firebase-forum';
import {IsString} from "js-vextensions";
import {StoreAccessor} from "mobx-firelink";
import {PermissionGroupSet} from "./userExtras/@UserExtraInfo";
import {MapNode} from "./nodes/@MapNode";
import {GetUserPermissionGroups, MeID} from "./users";
import {Term} from "./terms/@Term";
import {Image} from "./images/@Image";
import {Map} from "./maps/@Map";
import {MapNodePhrasing} from "./nodePhrasings/@MapNodePhrasing";
import {Timeline} from "./timelines/@Timeline";

// selectors
// ==========

export const CanGetBasicPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions == null || permissions.basic; // if anon/not-logged-in, assume user can get basic permissions once logged in
});
export const HasBasicPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	// if (true) return HasModPermissions(userIDOrPermissions); // temp; will be removed once GAD is over

	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.basic : false;
});
export const HasModPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.mod : false;
});
export const HasAdminPermissions = StoreAccessor(s=>(userIDOrPermissions: string | PermissionGroupSet)=>{
	const permissions = IsString(userIDOrPermissions) ? GetUserPermissionGroups(userIDOrPermissions) : userIDOrPermissions;
	return permissions ? permissions.admin : false;
});
/** If user is the creator, also requires that they (still) have basic permissions. */
export const IsUserCreatorOrMod = StoreAccessor(s=>(userID: string, entity: Term | Image | Map | MapNode | MapNodePhrasing | Timeline /* | Post | Thread */)=>{
	return (entity && entity.creator === userID && HasBasicPermissions(userID)) || HasModPermissions(userID);
});