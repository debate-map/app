import Moment from "moment";
import {Column, Row, Text} from "react-vcomponents";
import {Link} from "web-vcore";
import {E} from "js-vextensions";
import {GetAccessPolicy, GetUser} from "dm_common";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export type GenericEntryInfoUIProps = {
	id: string | number;
	creatorID: string;
	createdAt: number;
	accessPolicyID?: string;
	accessPolicyButton?: React.JSX.Element;
	singleLine?: boolean;
};

export const GenericEntryInfoUI = observer_mgl((props: GenericEntryInfoUIProps)=>{
	const {id, creatorID, createdAt, accessPolicyID, accessPolicyButton, singleLine = false} = props;

	const creator = GetUser(creatorID);
	const accessPolicy = accessPolicyID ? GetAccessPolicy(accessPolicyID) : null;

	const createdAtTimeStr = Moment(createdAt).format("YYYY-MM-DD HH:mm:ss");
	const userLink = (
		<Link text={creator == null ? "n/a" : creator.displayName}
			actionFunc={s=>{
				if (creator != null) {
					s.main.page = "database";
					s.main.database.subpage = "users";
					s.main.database.selectedUserID = creatorID;
				}
			}}/>
	);

	const accessPolicyLink = accessPolicy == null ? null : (
		<Link text={accessPolicy.name}
			actionFunc={s=>{
				s.main.page = "database";
				s.main.database.subpage = "policies";
				s.main.database.selectedPolicyID = accessPolicyID;
			}}/>
	);

	return (
		<Column sel style={E(singleLine && {fontSize: 14})}>
			{singleLine &&
				<Row center>
					<Text>ID: {id} ({createdAtTimeStr}, by: </Text>
					{userLink}
					<Text>)</Text>
				</Row>}

			{!singleLine &&
			<>
				<Row>ID: {id}</Row>
				<Row center>
					<Text>Created at: {createdAtTimeStr} (by: </Text>
					{userLink}
					<Text>)</Text>
				</Row>
				{accessPolicy &&
				<Row center>
					<Text>Access-policy: </Text>{accessPolicyLink}{accessPolicyButton}
				</Row>}
			</>}
		</Column>
	);
});
