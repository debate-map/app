import {CachedTransform, IsNaN} from "web-vcore/nm/js-vextensions.js";
import {GetDoc, GetDocs, CreateAccessor} from "web-vcore/nm/mobx-graphlink.js";
import {Media} from "./media/@Media.js";

export const GetMedia = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.medias.get(id!));
});
/*export async function GetImageAsync(id: string) {
	return await GetDataAsync(`images/${id}`) as Image;
}*/

export const GetMedias = CreateAccessor((): Media[]=>{
	return GetDocs({}, a=>a.medias);
});
export const GetMediasByURL = CreateAccessor((url: string): Media[]=>{
	return GetDocs({
		//queryOps: [new WhereOp("url", "==", url)],
		params: {filter: {
			url: {equalTo: url},
		}},
	}, a=>a.medias);
});