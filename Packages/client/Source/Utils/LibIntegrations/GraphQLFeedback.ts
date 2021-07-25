import {feedback_manager, Feedback_store} from "web-vcore/nm/graphql-feedback.js";
import Moment from "moment";
import {store} from "Store";
import {logTypes} from "Utils/General/Logging";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel";
import {GetUser, GetUserPermissionGroups, MeID} from "dm_common";
import {VReactMarkdown_Remarkable} from "web-vcore";
import {apolloClient} from "./Apollo";
import {GetNewURLForStoreChanges} from "./WVC";

export function InitGraphQLFeedback() {
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
		apollo: apolloClient as any,
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

		//dbPath: DBPath({}, "modules/feedback"),
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
	/*store.feedback = Feedback_store;
	store.feedback_graphlink = feedback_graph;*/
}