import {CachedTransform, IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, StoreAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {Media} from "./media/@Media.js";

export const GetMedia = StoreAccessor(s=>(id: string)=>{
	if (id == null || IsNaN(id)) return null;
	return GetDoc({}, a=>a.medias.get(id));
});
/* export async function GetImageAsync(id: string) {
	return await GetDataAsync(`images/${id}`) as Image;
} */

export const GetMedias = StoreAccessor(s=>(): Media[]=>{
	return GetDocs({}, a=>a.medias);
});
export const GetMediasByURL = StoreAccessor(s=>(url: string): Media[]=>{
	return GetDocs({
		//queryOps: [new WhereOp("url", "==", url)],
		params: {filter: {
			url: {equalTo: url},
		}}
	}, a=>a.medias);
});