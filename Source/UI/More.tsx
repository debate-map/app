import {BaseComponent, RouteProps, Div} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import {Route} from "react-router";
import AdminUI from "./More/Admin";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
import {IsUserAdmin} from "../Store/firebase/userExtras";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUserID, GetUserPermissionGroups} from "../Store/firebase/users";
import {styles} from "../Frame/UI/GlobalStyles";

@Connect(()=> ({
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
}))
export default class MoreUI extends BaseComponent<{page?} & RouteProps, {}> {
	render() {
		let {page, children, match} = this.props;
		let admin = IsUserAdmin(GetUserID());
		return (
			<div>
				<SubNavbar>
					{admin && <SubNavBarButton to={`${match.url}`} text="Admin"/>}
				</SubNavbar>
				{admin && <Route path={`${match.url}`} component={AdminUI}/>}
				{!admin && <div style={styles.page}>More page is under development.</div>}
			</div>
		);
	}
}