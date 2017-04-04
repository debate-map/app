import {BaseComponent, RouteProps, Div} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import {Route} from "react-router";
import AdminUI from "./More/Admin";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {IsUserAdmin} from "../Store/firebase/userExtras";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUserID, GetUserPermissionGroups} from "../Store/firebase/users";
import {styles} from "../Frame/UI/GlobalStyles";
import {GetPathNodes} from "../Store/router";

@Connect(state=> ({
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
}))
export default class MoreUI extends BaseComponent<{page?} & RouteProps, {}> {
	render() {
		//let {page, children, match: {url: path = ""} = {}} = this.props;
		let {page, children} = this.props;
		let path = "/more";
		let admin = IsUserAdmin(GetUserID());
		return (
			<div>
				<SubNavBar>
					{admin && <SubNavBarButton to={path} toImplied={path + "/admin"} text="Admin"/>}
				</SubNavBar>
				{admin && <Route path={path} component={AdminUI}/>}
				{!admin && <div style={styles.page}>More page is under development.</div>}
			</div>
		);
	}
}