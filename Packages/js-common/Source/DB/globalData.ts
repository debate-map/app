import {Assert} from "js-vextensions";
import {CreateAccessor, GetDocs} from "web-vcore/nm/mobx-graphlink.js";
import {GlobalData} from "./globalData/@GlobalData.js";

export const GetGlobalData = CreateAccessor((): GlobalData|n=>{
	const globalDatas = GetDocs({}, a=>a.globalData);
	Assert(globalDatas.length <= 1, "There should not be more than one global-data row!");
	//return globalDatas[0] ?? new GlobalData();
	return globalDatas[0];
});

export const IsDBReadOnly = CreateAccessor(()=>{
	return GetGlobalData()?.extras.dbReadOnly ?? false;
});
export const GetDBReadOnlyMessage = CreateAccessor(()=>{
	return GetGlobalData()?.extras.dbReadOnly_message ?? "Maintenance.";
});