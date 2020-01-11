import {CachedTransform, IsNaN} from "js-vextensions";
import {GetDoc, GetDocs, StoreAccessor, WhereFilter} from "mobx-firelink";
import {Image} from "./images/@Image";

export const GetImage = StoreAccessor(s=>(id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.images.get(id));
});
/* export async function GetImageAsync(id: string) {
	return await GetDataAsync(`images/${id}`) as Image;
} */

export const GetImages = StoreAccessor(s=>(): Image[]=>{
	return GetDocs({}, a=>a.images);
});
export const GetImagesByURL = StoreAccessor(s=>(url: string): Image[]=>{
	return GetDocs({
		filters: [new WhereFilter("url", "==", url)],
	}, a=>a.images);
});