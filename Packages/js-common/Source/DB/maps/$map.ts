import {emptyArray} from "web-vcore/nm/js-vextensions.js";
import {CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {globalMapID} from "../../DB_Constants.js";
import {DoesPolicyAllowX} from "../@Shared/TablePermissions.js";
import {GetAccessPolicy} from "../accessPolicies.js";
import {APAction, APTable, PermissionSet} from "../accessPolicies/@PermissionSet.js";
import {GetMap} from "../maps.js";
import {GetUser, MeID} from "../users.js";
import {IsUserCreatorOrAdmin} from "../users/$user.js";
import {Map} from "./@Map.js";

export function IsUserMap(map: Map) {
	return map.id != globalMapID;
}

export const GetRootNodeID = CreateAccessor((mapID: string)=>{
	const map = GetMap(mapID);
	if (map == null) return null;
	return map.rootNode;
});

export const GetMapEditorIDs = CreateAccessor((mapID: string)=>{
	return GetMap.NN(mapID).editors; // nn: this function should only be called for maps known to exist (and maps still-loading will just bail)
});
export const GetMapEditors = CreateAccessor((mapID: string)=>{
	return GetMapEditorIDs.BIN(mapID).map(id=>GetUser(id));
});

/*
current_setting('app.current_user_id') = entry_creator
or current_setting('app.current_user_admin') = 'true'
or exists (
	select 1 from app."accessPolicies" where id = policyID and (
		(
			"permissions" -> policyField -> 'access' = 'true'
			and coalesce("permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access', 'null'::jsonb) != 'false'
		)
		or "permissions_userExtends" -> current_setting('app.current_user_id') -> policyField -> 'access' = 'true'
	)
)
*/
// see InitDB_Template.ts for source RLS policy
export const DoesMapPolicyGiveMeAccess_ExtraCheck = CreateAccessor((mapID: string)=>{
	const map = GetMap(mapID);
	if (map == null) return false;
	const accessPolicy = GetAccessPolicy(map.accessPolicy);
	if (accessPolicy == null) return false;

	if (IsUserCreatorOrAdmin(MeID(), map)) return true;
	return DoesPolicyAllowX(MeID(), map.accessPolicy, APTable.maps, APAction.access);
});