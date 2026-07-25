import {CachedTransform, IsNaN, emptyArray_forLoading} from "js-vextensions";
import {GetDoc, GetDocs, CreateAccessor, Bail} from "mobx-graphlink";
import {Media} from "./media/@Media.js";

export const GetMedia = CreateAccessor((id: string|n)=>{
	return GetDoc({}, a=>a.medias.get(id!));
});
/*export async function GetImageAsync(id: string) {
	return await GetDataAsync(`images/${id}`) as Image;
}*/

export const GetMedias = CreateAccessor((): Media[]=>{
	const result = GetDocs({}, a=>a.medias);
	if (result == emptyArray_forLoading) Bail("Media are still loading.");
	return result;
});
export const GetMediasByURL = CreateAccessor((url: string|n): Media[]=>{
	return GetDocs({
		//queryOps: [new WhereOp("url", "==", url)],
		params: {filter: {
			url: url && {equalTo: url},
		}},
	}, a=>a.medias);
});
