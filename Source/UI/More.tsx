import {BaseComponent, RouteProps, Div} from "../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import {Route} from "react-router";
import AdminUI from "./More/Admin";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {IsUserAdmin} from "../Store/firebase/userExtras";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUserID, GetUserPermissionGroups, GetUsers} from "../Store/firebase/users";
import {styles} from "../Frame/UI/GlobalStyles";
import {connect} from "react-redux";
import {RootState} from "../Store/index";
import LinksUI from "./More/Links";
import {Switch} from "react-router-dom";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";

/*@(connect((state: RootState)=> ({
	userID: state.firebase.get("auth") ? state.firebase.get("auth").uid : null,
}) as any) as any)*/
@Connect(state=> ({
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
	userCount: (GetUsers() || []).length,
}))
export default class MoreUI extends BaseComponent<{page?} & Partial<{userCount: number}>, {}> {
	render() {
		let {page, userCount, children} = this.props;
		let path = "/more";
		let admin = IsUserAdmin(GetUserID());
		return (
			<Column style={{height: "100%"}}>
				<SubNavBar>
					<SubNavBarButton to={path} toImplied={path + "/links"} text="Links"/>
					{admin && <SubNavBarButton to={path + "/admin"} text="Admin"/>}
				</SubNavBar>
				<ScrollView style={{flex: `1 1 100%`}} scrollVBarStyle={{width: 10}}>
					<Switch>
						<Route path={path + "/admin"} component={AdminUI}/>
						<Route component={LinksUI}/>
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}