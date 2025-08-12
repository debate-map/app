import {Row, Column} from "react-vcomponents";
import Moment from "moment";
import {ScrollView} from "react-vscrollview";
import {Link, PageContainer, ES, css2} from "web-vcore";
import {GetSelectedUser} from "Store/main/database";
import {ToNumber} from "js-vextensions";
import {GetUsers, GetUser, User} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {useMemo, useState} from "react";
import {UserProfileUI} from "./Users/UserProfile.js";
import {ColumnData, TableData, TableHeader} from "../@Shared/TableHeader/TableHeader.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

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

export const UsersUI = observer_mgl(()=>{
	const users = GetUsers();
	const selectedUser = GetSelectedUser();

	const [tableData, setTableData] = useState({columnSort: "", columnSortDirection: "", filters: []} as TableData);
	const onTableChange = (tD: TableData)=>{
		setTableData({
			columnSort: tD.columnSort,
			columnSortDirection: tD.columnSortDirection,
			filters: [...tD.filters],
		});
	};

	const sortedAndFilteredUsers = useMemo(()=>{
		return sortAndFilterUsers(users, tableData);
	}, [users, tableData]);

	if (selectedUser) {
		return <UserProfileUI user={selectedUser}/>;
	}

	return (
		<PageContainer style={{padding: 0, background: undefined}}>
			<TableHeader columns={columns} onTableChange={onTableChange} tableData={tableData}/>
			<ScrollView style={ES({flex: 1})} contentStyle={ES({
				flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
			})}>
				{users.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
				{sortedAndFilteredUsers.map((user, index)=>{
					return <UserRow key={user.id} index={index} last={index == sortedAndFilteredUsers.length - 1} user={user}/>;
				})}
			</ScrollView>
		</PageContainer>
	);
});

const sortAndFilterUsers = (users: User[], tableData: TableData)=>{
	let output: User[] = users.slice();

	// start with the "default sorting"
	/*output = output.OrderBy((a) => (userExtraInfoMap[a.id] ? userExtraInfoMap[a.id].joinDate : Number.MAX_SAFE_INTEGER));
	output = output.OrderByDescending((a) => (userExtraInfoMap[a.id] ? (userExtraInfoMap[a.id].edits | 0) : Number.MIN_SAFE_INTEGER));*/
	output = output.OrderBy(a=>ToNumber(GetUser(a.id)?.joinDate, Number.MAX_SAFE_INTEGER));
	output = output.OrderByDescending(a=>ToNumber(GetUser(a.id)?.edits, 0));

	// then apply user's custom sorting
	if (tableData.columnSort) {
		switch (tableData.columnSort) {
			case "displayName": {
				output = output.OrderBy(a=>a.displayName);
				break;
			}
			case "joined": {
				output = output.OrderBy(a=>ToNumber(GetUser(a.id)?.joinDate, Number.MAX_SAFE_INTEGER));
				break;
			}
			case "edits": {
				output = output.OrderByDescending(a=>ToNumber(GetUser(a.id)?.edits, 0));
				break;
			}
			case "lastEdit": {
				output = output.OrderByDescending(a=>ToNumber(GetUser(a.id)?.lastEditAt, 0));
				break;
			}
			case "permissions": {
				output = output.OrderBy(a=>{
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

	// then apply user's custom filtering
	for (const filter of tableData.filters) {
		output = output.filter(a=>{
			if (filter.key == "displayName") return a.displayName.toLowerCase().includes(filter.value.toLowerCase());
			if (filter.key == "joined") return Moment(a.joinDate).format("YYYY-MM-DD").includes(filter.value);
			if (filter.key == "edits") return (a.edits || 0).toString().includes(filter.value);
			if (filter.key == "lastEdit" && a.lastEditAt) return Moment(a.lastEditAt).format("YYYY-MM-DD").includes(filter.value);
			if (filter.key == "permissions") return ["basic", "verified", "mod", "admin"].filter(b=>(a.permissionGroups || {})[b]).join(", ").toLowerCase().includes(filter.value.toLowerCase());
			console.error("Unknown filter key:", filter.key);
		});
	}

	return output;
}

export const UserRow = observer_mgl(({index, last, user}: {index: number, last: boolean, user: User})=>{
	let {displayName} = user;
	if (displayName.includes("@")) displayName = displayName.split("@")[0];
	const css = css2;
	return (
		<Column p="7px 10px" style={css(
			{background: index % 2 == 0 ? liveSkin.ListEntryBackgroundColor_Light().css() : liveSkin.ListEntryBackgroundColor_Dark().css()},
			last && {borderRadius: "0 0 10px 10px"},
		)}>
			<Row>
				<Link text={displayName} actionFunc={s=>s.main.database.selectedUserID = user.id} style={{flex: columns[0].width, fontSize: 17}}/>
				<span style={{flex: columns[1].width}}>{Moment(user.joinDate).format("YYYY-MM-DD")}</span>
				<span style={{flex: columns[2].width}}>{user.edits || 0}</span>
				<span style={{flex: columns[3].width}}>{user.lastEditAt ? Moment(user.lastEditAt).format("YYYY-MM-DD") : "n/a"}</span>
				<span style={{flex: columns[4].width}}>
					{["basic", "verified", "mod", "admin"].filter(a=>(user.permissionGroups || {})[a]).map(a=>a.replace(/^./, ch=>ch.toUpperCase())).join(", ")}
				</span>
			</Row>
		</Column>
	);
});
