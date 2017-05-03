import {GetData, GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Term} from "./terms/@Term";
import {IsNaN} from "../../Frame/General/Types";
import {CachedTransform} from "../../Frame/V/VCache";

export function GetTerm(id: number) {
	if (id == null || IsNaN(id)) return null;
	return GetData(`terms/${id}`) as Term;
}
export async function GetTermAsync(id: number) {
	return await GetDataAsync(`terms/${id}`) as Term;
}

export function GetTerms(): Term[] {
	let termsMap = GetData(`terms`);
	return CachedTransform("GetTerms", {}, termsMap, ()=>termsMap ? termsMap.VValues(true) : []);
}