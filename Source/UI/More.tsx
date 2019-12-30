import {Switch} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {HasAdminPermissions} from "Store/firebase/userExtras";
import {store} from "Store";
import {Observer} from "vwebapp-framework";
import {GetUsers, MeID} from "../Store/firebase/users";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar";
import {AdminUI} from "./More/Admin";
import {LinksUI} from "./More/Links";

@Observer
export class MoreUI extends BaseComponentPlus({} as {}, {}) {
	render() {
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
					{/* currentSubpage == "tasks" && <TasksUI/> */}
					{currentSubpage == "admin" && <AdminUI/>}
				</Switch>
			</>
		);
	}
}