import {feedback_manager, Feedback_store} from "firebase-feedback";
import {DBPath} from "mobx-firelink";
import Moment from "moment";
import {store} from "Source/Store";
import {ShowSignInPopup} from "Source/UI/@Shared/NavBar/UserPanel";
import {logTypes} from "Source/Utils/General/Logging";
import {VReactMarkdown_Remarkable} from "vwebapp-framework";
import {MeID, GetUser} from "@debate-map/server-link/Source/Link";
import {GetUserPermissionGroups} from "@debate-map/server-link/Source/Link";
import {GetNewURLForStoreChanges} from "./VWAF";

export function InitFeedback() {
	feedback_manager.Populate({
		GetStore: ()=>store,
		/* GetNewURL: (actionsToDispatch: Action<any>[])=> {
			let newState = State();
			for (let action of actionsToDispatch) {
				newState = store.reducer(newState, action);
			}
			StartStateDataOverride("", newState);
			StartStateCountAsAccessOverride(false);
			let newURL = GetNewURL();
			StopStateCountAsAccessOverride();
			StopStateDataOverride();
			return newURL;
		}, */
		FormatTime: (time: number, formatStr: string)=>{
			if (formatStr == "[calendar]") {
				const result = Moment(time).calendar();
				// if (result.includes("/")) return Moment(time).format("YYYY-MM-DD");
				return result;
			}
			return Moment(time).format(formatStr);
		},

		// PushHistoryEntry,

		logTypes,

		ShowSignInPopup,
		GetUserID: MeID,
		GetUser,
		GetUserPermissionGroups,

		MarkdownRenderer: VReactMarkdown_Remarkable,

		dbPath: DBPath({}, "modules/feedback"),
		// storePath_mainData: 'feedback',

		/* GetNewURLForStoreChanges: (actionFunc) => {
			/* const newState = produce(Feedback_store, (draft) => {
				actionFunc(draft);
			}); *#/
			const newState = produce(store, (draft: RootState) => {
				actionFunc(draft.feedback);
			});
			// have new-state used for our store-accessors (ie. GetNewURL) [this part's probably not actually needed, since we just call lib store-accessor]
			const newURL = WithStore({}, newState, () => {
				// and have new-state used for firebase-feedback's store-accessors (ie. GetSelectedProposalID, as called by our GetNewURL)
				return WithStore({ fire: Feedback_store.firelink }, newState.feedback, () => {
					return GetNewURL();
				});
			});
			return newURL.toString();
		}, */
		GetNewURLForStoreChanges: actionFunc=>GetNewURLForStoreChanges(actionFunc, rootStore=>rootStore.feedback),
	});
	store.feedback = Feedback_store;
}