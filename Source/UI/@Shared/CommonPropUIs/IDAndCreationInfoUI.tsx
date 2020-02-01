import Moment from "moment";
import {Column, Pre, Row, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {Link, Observer} from "vwebapp-framework";
import {User} from "Store/firebase/users/@User";
import {GetUser} from "Store/firebase/users";
import {E} from "js-vextensions";

@Observer
export class IDAndCreationInfoUI extends BaseComponentPlus({singleLine: false} as {id: string | number, creatorID: string, createdAt: number, singleLine?: boolean}, {}) {
	render() {
		const {id, creatorID, createdAt, singleLine} = this.props;
		const creator = GetUser(creatorID);

		const createdAtTimeStr = Moment(createdAt).format("YYYY-MM-DD HH:mm:ss");
		const userLink = (
			<Link text={creator == null ? "n/a" : creator.displayName}
						actionFunc={s=>{
							if (creator != null) {
								s.main.page = "database";
								s.main.database.subpage = "users";
								s.main.database.selectedUserID = creatorID;
							}
						}} />
		);
		return (
			<Column sel style={E(singleLine && {fontSize: 14})}>
				{singleLine &&
					<Row>
						<Text>ID: {id} ({createdAtTimeStr}, by: </Text>
						{userLink}
						<Text>)</Text>
					</Row>}
				{!singleLine &&
				<>
					<Row>ID: {id}</Row>
					<Row>
						<Text>Created at: {createdAtTimeStr} (by: </Text>
						{userLink}
						<Text>)</Text>
					</Row>
				</>}
			</Column>
		);
	}
}