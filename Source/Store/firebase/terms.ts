import {GetData, GetDataAsync} from "../../Frame/Database/DatabaseHelpers";
import {Term} from "./terms/@Term";
import {IsNaN} from "../../Frame/General/Types";

export function GetNode(id: number) {
	if (id == null || IsNaN(id)) return null;
	return GetData(`nodes/${id}`) as Term;
}
export async function GetTermAsync(id: number) {
	return await GetDataAsync(`terms/${id}`) as Term;
}