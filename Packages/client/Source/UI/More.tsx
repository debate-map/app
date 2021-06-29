import {Switch} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {Observer} from "web-vcore";
import {SubNavBar, SubNavBarButton} from "./@Shared/SubNavBar.js";
import {AdminUI} from "./More/Admin.js";
import {LinksUI} from "./More/Links.js";
import {HasAdminPermissions} from "dm_common";
import {MeID, GetUsers} from "dm_common";

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