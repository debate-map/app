import {GetDataAsync} from "../../../../Frame/Database/DatabaseHelpers";
import {AddUpgradeFunc} from "../../Admin";
import {ContentNode} from "../../../../Store/firebase/contentNodes/@ContentNode";
import {SourceType, SourceChain, Source} from "Store/firebase/contentNodes/@SourceChain";
import {FirebaseData} from "../../../../Store/firebase";
import {IsArgumentNode} from "../../../../Store/firebase/nodes/$node";

let newVersion = 6;
AddUpgradeFunc(newVersion, (oldData: FirebaseData)=> {
	let data = FromJSON(ToJSON(oldData)) as FirebaseData;

	for (let nodeRatingRoot of data.nodeRatings.VValues(true)) {
		for (let ratingType in nodeRatingRoot) {
			if (ratingType != "adjustment") continue;
			for (let forUser of nodeRatingRoot[ratingType].VValues(true)) {
				forUser.value = forUser.value.Distance(50) * 2;
			}
		}
	}

	return data;
});