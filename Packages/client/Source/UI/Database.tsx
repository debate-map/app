import {Switch} from "react-vcomponents";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import React from "react";
import {MediasUI} from "./Database/MediasUI.js";
import {TermsUI} from "./Database/TermsUI.js";
import {UsersUI} from "./Database/Users.js";
import {PoliciesUI} from "./Database/PoliciesUI.js";
import {SubscriptionsPaginatedUI} from "./Database/SubscriptionsPaginatedUI.js";
import {observer_mgl} from "mobx-graphlink";

export const DatabaseUI = observer_mgl(()=>{
	const currentSubpage = store.main.database.subpage;
	const page = "database";

	return (
		<>
			<SubNavBar>
				<SubNavBarButton page={page} subpage="users" text="Users" actionFuncIfAlreadyActive={s=>s.main.database.selectedUserID = null}/>
				<SubNavBarButton page={page} subpage="terms" text="Terms" /* actionIfAlreadyActive={() => new ACTTermSelect({ id: null })} *//>
				<SubNavBarButton page={page} subpage="media" text="Media" /* actionIfAlreadyActive={() => new ACTImageSelect({ id: null })} *//>
				<SubNavBarButton page={page} subpage="policies" text="Policies"/>
				<SubNavBarButton page={page} subpage="subscriptions" text="Subscriptions"/>
			</SubNavBar>
			<Switch>
				<UsersUI/>
				{currentSubpage == "terms" && <TermsUI/>}
				{currentSubpage == "media" && <MediasUI/>}
				{currentSubpage == "policies" && <PoliciesUI/>}
				{currentSubpage == "subscriptions" && <SubscriptionsPaginatedUI/>}
			</Switch>
		</>
	);
});
