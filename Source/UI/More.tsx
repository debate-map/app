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
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";
import Switch from "Frame/ReactComponents/Switch";

type Props = {} & Partial<{currentSubpage: string, userCount: number}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.more.subpage),
	_: GetUserPermissionGroups(GetUserID()), // just to make sure we've retrieved this data (and re-render when it changes)
	userCount: (GetUsers() || []).length,
}))
export default class MoreUI extends BaseComponent<Props, {}> {
	render() {
		let {userCount, currentSubpage, children} = this.props;
		let page = "more";
		let admin = IsUserAdmin(GetUserID());
		return (
			<Column style={{height: "100%"}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="links" text="Links"/>
					{admin && <SubNavBarButton {...{page}} subpage="admin" text="Admin"/>}
				</SubNavBar>
				<ScrollView style={{flex: `1 1 100%`}} scrollVBarStyle={{width: 10}}>
					<Switch>
						{currentSubpage == "admin" && <AdminUI/>}
						<LinksUI/>
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}