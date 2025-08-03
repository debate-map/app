import React from "react";
import {Switch} from "react-vcomponents";
import {store} from "Store";
import {SubNavBar, SubNavBarButton} from "web-vcore";
import {HasAdminPermissions, MeID, GetUsers} from "dm_common";
import {AdminUI} from "./More/Admin.js";
import {LinksUI} from "./More/Links.js";
import {observer_mgl} from "mobx-graphlink";

export const MoreUI = observer_mgl(()=>{
	const admin = HasAdminPermissions(MeID());
	const userCount = (GetUsers() || []).length;
	const currentSubpage = store.main.more.subpage;
	const page = "more";

	return (
		<>
            <SubNavBar>
                <SubNavBarButton page={page} subpage="links" text="Links"/>
                {/* <SubNavBarButton page={page} subpage="tasks" text="Tasks"/> */}
                {admin && <SubNavBarButton page={page} subpage="admin" text="Admin"/>}
            </SubNavBar>
            <Switch>
                <LinksUI/>
                {/* currentSubpage === "tasks" && <TasksUI/> */}
                {currentSubpage === "admin" && <AdminUI/>}
            </Switch>
		</>
	);
})
