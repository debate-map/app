import {CachedTransform, IsNaN} from "web-vcore/nm/js-vextensions";
import {GetDoc, GetDocs, StoreAccessor, WhereOp} from "web-vcore/nm/mobx-graphlink";
import {Media} from "./media/@Media";

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
		queryOps: [new WhereOp("url", "==", url)],
	}, a=>a.medias);
});