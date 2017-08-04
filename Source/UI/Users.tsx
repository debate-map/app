import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {GetUsers, GetUserExtraInfoMap, UserExtraInfoMap, User} from "../Store/firebase/users";
import Row from "../Frame/ReactComponents/Row";
import UserExtraInfo from "../Store/firebase/userExtras/@UserExtraInfo";
import Moment from "moment";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";

export const columnWidths = [.35, .15, .1, .15, .25];

@Connect(state=> ({
	users: GetUsers(),
	userExtraInfoMap: GetUserExtraInfoMap(),
}))
export default class UsersUI extends BaseComponent<{} & Partial<{users: User[], userExtraInfoMap: UserExtraInfoMap}>, {}> {
	render() {
		let {users, userExtraInfoMap} = this.props;
		if (userExtraInfoMap == null) return <div/>;

		users = users.OrderBy(a=>userExtraInfoMap[a._key] ? userExtraInfoMap[a._key].joinDate : Number.MAX_SAFE_INTEGER);

		return (
			<Column style={{width: 960, margin: "20px auto 20px auto", height: "calc(100% - 40px)", filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
				<Column className="clickThrough" style={{height: 40, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					{/*<Row style={{height: 40, padding: 10}}>
						<Row width={200} style={{position: "absolute", left: "calc(50% - 100px)"}}>
							<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
								enabled={page > 0} onClick={()=> {
									//store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
								}}/>
							<Div ml={10} mr={7}>Page: </Div>
							<TextInput mr={10} pattern="[0-9]+" style={{width: 30}} value={page + 1}
								onChange={val=> {
									if (!IsNumberString(val)) return;
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage)}))
								}}/>
							<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
								enabled={page < lastPage} onClick={()=> {
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page + 1}));
								}}/>
						</Row>
						<Div mlr="auto"/>
						<Pre>Filter:</Pre>
						<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
						<TextInput ml={2} value={filter} onChange={val=>store.dispatch(new ACTMapNodeListFilterSet({mapID: map._id, filter: val}))}/>
					</Row>*/}
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Name</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Joined</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Edits</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[4], fontWeight: 500, fontSize: 17}}>Permissions</span>
					</Row>
				</Column>
				<ScrollView contentStyle={{flex: 1}}>
					{users.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{users.OrderBy(a=>userExtraInfoMap[a._key] ? userExtraInfoMap[a._key].joinDate : Number.MAX_SAFE_INTEGER).map((user, index)=> {
						let userExtraInfo = userExtraInfoMap[user._key];
						return <UserRow key={user._key} index={index} last={index == users.length - 1} user={user} userExtraInfo={userExtraInfo}/>;
					})}
				</ScrollView>
			</Column>
		);

		/*return (
			<Column style={styles.page}>
				<Row>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Name</span>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Join date</span>
					<span style={{flex: .33, fontWeight: 500, fontSize: 17}}>Permissions</span>
				</Row>
				<ScrollView contentStyle={{flex: 1, padding: 10}}>
					
				</ScrollView>
			</Column>
		);*/
	}
}

class UserRow extends BaseComponent<{index: number, last: boolean, user: User, userExtraInfo: UserExtraInfo}, {}> {
	render() {
		let {index, last, user, userExtraInfo} = this.props;

		return (
			<Column p={10} style={E(
				{background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)"},
				last && {borderRadius: "0 0 10px 10px"}
			)}>
				<Row>
					{/*<a href={toURL.toString({domain: false})} style={{fontSize: 18, flex: columnWidths[0]}} onClick={e=> {
						e.preventDefault();
						store.dispatch(new ACTDebateMapSelect({id: map._id}));
					}}>
						{map.name}
					</a>*/}
					<span style={{flex: columnWidths[0]}}>{user.displayName}</span>
					<span style={{flex: columnWidths[1]}}>{userExtraInfo ? Moment(userExtraInfo.joinDate).format("YYYY-MM-DD") : "n/a"}</span>
					<span style={{flex: columnWidths[2]}}>{userExtraInfo.edits || 0}</span>
					<span style={{flex: columnWidths[3]}}>{Moment(userExtraInfo.lastEditAt).format("YYYY-MM-DD")}</span>
					<span style={{flex: columnWidths[4]}}>{userExtraInfo == null ? "n/a" :
						["basic", "verified", "mod", "admin"].filter(a=>userExtraInfo.permissionGroups[a]).map(a=>a.replace(/^./, a=>a.toUpperCase())).join(", ")}</span>
				</Row>
			</Column>
		);
	}
}