import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUsers, GetUserExtraInfoMap, UserExtraInfoMap, User} from "../Store/firebase/users";
import Row from "../Frame/ReactComponents/Row";
import UserExtraInfo from "../Store/firebase/userExtras/@UserExtraInfo";
import * as Moment from "moment";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";

@Connect(state=> ({
	users: GetUsers(),
	userExtraInfoMap: GetUserExtraInfoMap(),
}))
export default class UsersUI extends BaseComponent<{} & Partial<{users: User[], userExtraInfoMap: UserExtraInfoMap}>, {}> {
	render() {
		let {users, userExtraInfoMap} = this.props;
		if (userExtraInfoMap == null) return <div/>;
		return (
			<Column style={styles.page}>
				<Row>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Name</span>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Join date</span>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Permissions</span>
				</Row>
				<ScrollView contentStyle={{flex: 1, padding: 10}}>
					{users.OrderBy(a=>userExtraInfoMap[a._key] ? userExtraInfoMap[a._key].joinDate : Number.MAX_SAFE_INTEGER).map((user, index)=> {
						let userExtraInfo = userExtraInfoMap[user._key];
						return <UserRow key={user._key} user={user} userExtraInfo={userExtraInfo}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}

class UserRow extends BaseComponent<{user: User, userExtraInfo: UserExtraInfo}, {}> {
	render() {
		let {user, userExtraInfo} = this.props;
		return (
			<Row sel>
				<span style={{flex: .33}}>{user.displayName}</span>
				<span style={{flex: .33}}>{userExtraInfo ? (Moment as any)(userExtraInfo.joinDate).format("YYYY-MM-DD") : "n/a"}</span>
				<span style={{flex: .33}}>{userExtraInfo == null ? "n/a" :
					["basic", "verified", "mod", "admin"].filter(a=>userExtraInfo.permissionGroups[a]).map(a=>a.replace(/^./, a=>a.toUpperCase())).join(", ")}</span>
			</Row>
		);
	}
}