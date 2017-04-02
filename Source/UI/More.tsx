import {BaseComponent, RouteProps} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import {Route} from "react-router";
import AdminUI from "./More/Admin";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
import {IsUserAdmin} from "../Store/firebase/userExtras";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUserID, GetUserPermissionGroups} from "../Store/firebase/users";

@Connect(()=> ({
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
}))
export default class MoreUI extends BaseComponent<{page?} & RouteProps, {}> {
	render() {
		let {page, children, match} = this.props;
		return (
			<div>
				<SubNavbar>
					{IsUserAdmin(GetUserID()) && <SubNavBarButton to={`${match.url}`} text="Admin"/>}
				</SubNavbar>
				{IsUserAdmin(GetUserID()) && <Route path={`${match.url}`} component={AdminUI}/>}
			</div>
		);
	}
}