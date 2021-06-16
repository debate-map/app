import Moment from "web-vcore/nm/moment";
import {Column, Pre, Row, Text} from "web-vcore/nm/react-vcomponents";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {Link, Observer} from "vwebapp-framework";
import {E} from "web-vcore/nm/js-vextensions";
import {GetUser} from "@debate-map/server-link/Source/Link";

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