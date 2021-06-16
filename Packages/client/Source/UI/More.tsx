import {Switch} from "web-vcore/nm/react-vcomponents";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {store} from "Store";
import {Observer} from "vwebapp-framework";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar";
import {AdminUI} from "./More/Admin";
import {LinksUI} from "./More/Links";
import {HasAdminPermissions} from "@debate-map/server-link/Source/Link";
import {MeID, GetUsers} from "@debate-map/server-link/Source/Link";

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