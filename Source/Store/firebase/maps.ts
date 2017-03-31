import {GetData} from "../../Frame/Database/DatabaseHelpers";
import {Map} from "./maps/@Map";

export function GetMap(id: number): Map {
	return GetData(`maps/${id}`);
}