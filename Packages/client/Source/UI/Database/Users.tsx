import {BaseComponent, BaseComponentPlus, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {Row, Column} from "web-vcore/nm/react-vcomponents.js";
import Moment from "web-vcore/nm/moment";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {Link, PageContainer, Observer, ES} from "web-vcore";
import {GetSelectedUser} from "Store/main/database";
import {ToNumber} from "web-vcore/nm/js-vextensions.js";
import {GetUsers, GetUser, User} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {useMemo, useState} from "react";
import {UserProfileUI} from "./Users/UserProfile.js";
import {ColumnData, TableData, TableHeader} from "../@Shared/TableHeader/TableHeader.js";

const columns: ColumnData[] = [{
	key: "displayName" as const,
	label: "Name",
	width: 0.35,
	allowFilter: true,
	allowSort: true,
}, {
	key: "joined" as const,
	label: "Joined",
	width: 0.15,
	allowFilter: true,
	allowSort: true,
}, {
	key: "edits" as const,
	label: "Edits",
	width: 0.1,
	allowFilter: true,
	allowSort: true,
}, {
	key: "lastEdit" as const,
	label: "Last edit",
	width: 0.15,
	allowFilter: true,
	allowSort: true,
}, {
	key: "permissions" as const,
	label: "Permissions",
	width: 0.25,
	allowFilter: true,
	allowSort: true,
}];

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
		const [sortedAndFilteredUsers, setSortedAndFilteredUsers] = useState(users);

		const onTableChange = (tableData:TableData)=>{
			let output: User[] = [...users];

			if (tableData.columnSort) {
				switch (tableData.columnSort) {
					case "displayName": {
						output = users.OrderBy(a=>a.displayName);
						break;
					}
					case "joined": {
						output = users.OrderBy(a=>ToNumber(GetUser(a.id)?.joinDate, Number.MAX_SAFE_INTEGER));
						break;
					}
					case "edits": {
						output = users.OrderByDescending(a=>ToNumber(GetUser(a.id)?.edits, 0));
						break;
					}
					case "lastEdit": {
						output = users.OrderByDescending(a=>ToNumber(GetUser(a.id)?.lastEditAt, 0));
						break;
					}
					case "permissions": {
						output = users.OrderBy(a=>{
							let nrOfPermissions = 0;
							if (a.permissionGroups.basic) nrOfPermissions++;
							if (a.permissionGroups.verified) nrOfPermissions++;
							if (a.permissionGroups.mod) nrOfPermissions++;
							if (a.permissionGroups.admin) nrOfPermissions++;
							return nrOfPermissions;
						});
						break;
					}
					default: {
						console.warn(`Unknown columnSort: ${tableData.columnSort}`);
						break;
					}
				}
			}
			if (tableData.columnSortDirection == "desc") {
				output = output.reverse();
			}

			tableData.filters.forEach(filter=>{
				output = output.filter(a=>{
					if (filter.key == "displayName") {
						return a.displayName.toLowerCase().includes(filter.value.toLowerCase());
					} if (filter.key == "joined") {
						return Moment(a.joinDate).format("YYYY-MM-DD").includes(filter.value);
					} if (filter.key == "edits") {
						return (a.edits || 0).toString().includes(filter.value);
					} if (filter.key == "lastEdit" && a.lastEditAt) {
						return Moment(a.lastEditAt).format("YYYY-MM-DD").includes(filter.value);
					} if (filter.key == "permissions") {
						return ["basic", "verified", "mod", "admin"].filter(b=>(a.permissionGroups || {})[b]).join(", ").toLowerCase().includes(filter.value.toLowerCase());
					}
				});
			});

			setSortedAndFilteredUsers([...output]);
		};

		return (
			<PageContainer style={{padding: 0, background: null}}>
				<TableHeader columns={columns} onTableChange={onTableChange} />
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
				})}>
					{users.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{sortedAndFilteredUsers.map((user, index)=>{
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
					<Link text={displayName} actionFunc={s=>s.main.database.selectedUserID = user.id} style={{flex: columns[0].width, fontSize: 17}}/>
					{/* <span style={{ flex: columnWidths[0] }}>{displayName}</span> */}
					<span style={{flex: columns[1].width}}>{Moment(user.joinDate).format("YYYY-MM-DD")}</span>
					<span style={{flex: columns[2].width}}>{user.edits || 0}</span>
					<span style={{flex: columns[3].width}}>{user.lastEditAt ? Moment(user.lastEditAt).format("YYYY-MM-DD") : "n/a"}</span>
					<span style={{flex: columns[4].width}}>
						{["basic", "verified", "mod", "admin"].filter(a=>(user.permissionGroups || {})[a]).map(a=>a.replace(/^./, ch=>ch.toUpperCase())).join(", ")}
					</span>
				</Row>
			</Column>
		);
	}
}