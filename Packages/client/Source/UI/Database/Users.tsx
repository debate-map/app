import {BaseComponent, BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Row, Column} from "web-vcore/nm/react-vcomponents.js";
import Moment from "web-vcore/nm/moment";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {Link, PageContainer, Observer, ES, cssHelper} from "web-vcore";
import {GetSelectedUser} from "Store/main/database";
import {ToNumber, E} from "web-vcore/nm/js-vextensions.js";
import {GetUsers, GetUser, User} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {chroma_maxDarken} from "Utils/UI/General.js";
import {UserProfileUI} from "./Users/UserProfile.js";

export const columnWidths = [0.35, 0.15, 0.1, 0.15, 0.25];

@Observer
export class UsersUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		let users = GetUsers();
		// const userExtraInfoMap = GetUserExtraInfoMap();
		const selectedUser = GetSelectedUser();

		// if (userExtraInfoMap == null) return <div/>;
		if (selectedUser) {
			return <UserProfileUI user={selectedUser}/>;
		}

		users = users.filter(a=>a);
		/* users = users.OrderBy((a) => (userExtraInfoMap[a.id] ? userExtraInfoMap[a.id].joinDate : Number.MAX_SAFE_INTEGER));
		users = users.OrderByDescending((a) => (userExtraInfoMap[a.id] ? (userExtraInfoMap[a.id].edits | 0) : Number.MIN_SAFE_INTEGER)); */
		users = users.OrderBy(a=>ToNumber(GetUser(a.id)?.joinDate, Number.MAX_SAFE_INTEGER));
		users = users.OrderByDescending(a=>ToNumber(GetUser(a.id)?.edits, 0));
		return (
			<PageContainer style={{padding: 0, background: null}}>
				<Column className="clickThrough" style={{height: 40, background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
					{/* <Row style={{height: 40, padding: 10}}>
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
					</Row> */}
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Name</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Joined</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Edits</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[4], fontWeight: 500, fontSize: 17}}>Permissions</span>
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(),
					borderRadius: "0 0 10px 10px",
				})}>
					{users.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{users.map((user, index)=>{
						return <UserRow key={user.id} index={index} last={index == users.length - 1} user={user}/>;
					})}
				</ScrollView>
			</PageContainer>
		);
	}
}

@Observer
export class UserRow extends BaseComponent<{index: number, last: boolean, user: User}, {}> {
	render() {
		const {index, last, user} = this.props;

		let {displayName} = user;
		if (displayName.includes("@")) displayName = displayName.split("@")[0];
		const {css} = cssHelper(this);
		return (
			<Column p="7px 10px" style={css(
				{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
				last && {borderRadius: "0 0 10px 10px"},
			)}>
				<Row>
					<Link text={displayName} actionFunc={s=>s.main.database.selectedUserID = user.id} style={{flex: columnWidths[0], fontSize: 17}}/>
					{/* <span style={{ flex: columnWidths[0] }}>{displayName}</span> */}
					<span style={{flex: columnWidths[1]}}>{Moment(user.joinDate).format("YYYY-MM-DD")}</span>
					<span style={{flex: columnWidths[2]}}>{user.edits || 0}</span>
					<span style={{flex: columnWidths[3]}}>{user.lastEditAt ? Moment(user.lastEditAt).format("YYYY-MM-DD") : "n/a"}</span>
					<span style={{flex: columnWidths[4]}}>
						{["basic", "verified", "mod", "admin"].filter(a=>(user.permissionGroups || {})[a]).map(a=>a.replace(/^./, ch=>ch.toUpperCase())).join(", ")}
					</span>
				</Row>
			</Column>
		);
	}
}