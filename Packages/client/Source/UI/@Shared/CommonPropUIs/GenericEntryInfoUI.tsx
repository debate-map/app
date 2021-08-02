import Moment from "web-vcore/nm/moment";
import {Column, Pre, Row, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {Link, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {GetAccessPolicy, GetUser} from "dm_common";

@Observer
export class GenericEntryInfoUI extends BaseComponentPlus({singleLine: false} as {
	id: string | number,
	creatorID: string, createdAt: number,
	accessPolicyID?: string, accessPolicyButton?: JSX.Element,
	singleLine?: boolean,
}, {}) {
	render() {
		const {id, creatorID, createdAt, accessPolicyID, accessPolicyButton, singleLine} = this.props;
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
	}
}