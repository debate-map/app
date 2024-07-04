import {GetDocs, CreateAccessor} from "mobx-graphlink";
import {MeID, NodeType, SLMode_ForJSCommon} from "../DB.js";

export const GetNotifications = CreateAccessor((userId: string|n)=>{
	return GetDocs({
		params: {
			filter: {
				user: {equalTo: userId},
			},
		},
	}, a=>a.notifications);
});

export const ShowNotification = (type: NodeType)=>{
	// don't show subscription-level controls unless user is signed-in (adds a bit of visual clutter that isn't relevant for non-signed-in users)
	if (MeID() == null) return false;

	// for now, don't show subscription-level controls in SL mode (I haven't asked yet if it's wanted there)
	if (SLMode_ForJSCommon()) return false;

	// only show the notification bell for certain node-types (hide bell on argument nodes)
	const matchingNodeTypes = [NodeType.category, NodeType.claim, NodeType.package, NodeType.multiChoiceQuestion];
	if (!matchingNodeTypes.includes(type)) return false;

	return true;
};