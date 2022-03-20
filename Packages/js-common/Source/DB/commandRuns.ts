import {emptyArray, emptyArray_forLoading} from "web-vcore/nm/js-vextensions";
import {CreateAccessor, GetDoc, GetDocs} from "web-vcore/nm/mobx-graphlink";
import {MeID} from "./users.js";

export const GetCommandRuns = CreateAccessor((commandTypes?: string[], actorID?: string, showAll?: boolean)=>{
	//console.log("Test1:", MeID());
	// temp; when user-info not yet loaded, don't make db-request for command-runs table
	//		(it has RLS policies that give incomplete results if caller's user-id is null, and currently mobx-graphlink doesn't know how/when to refresh this once user-info is available)
	//if (MeID() == null) return emptyArray_forLoading;

	return GetDocs({
		//queryOps: [new WhereOp("name", "==", name)],
		params: {filter: {
			commandName: commandTypes && {in: commandTypes},
			actor: actorID && {equalTo: actorID},
			public_base: !showAll && {equalTo: true},
		}},
	}, a=>a.commandRuns);
});
export const GetCommandRun = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.commandRuns.get(id!));
});