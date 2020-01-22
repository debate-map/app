import Moment from "moment";
import {Column, Pre, Row, Text} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {Link, Observer} from "vwebapp-framework";
import {User} from "Store/firebase/users/@User";
import {GetUser} from "Store/firebase/users";

@Observer
export class IDAndCreationInfoUI extends BaseComponent<{id: string | number, creatorID: string, createdAt: number}, {}> {
	render() {
		const {id, creatorID, createdAt} = this.props;
		const creator = GetUser(creatorID);
		return (
			<Column sel>
				<Row>ID: {id}</Row>
				<Row>
					<Text>Created at: {Moment(createdAt).format("YYYY-MM-DD HH:mm:ss")} (by: </Text>
					<Link text={creator == null ? "n/a" : creator.displayName}
						actionFunc={s=>{
							if (creator != null) {
								s.main.page = "database";
								s.main.database.subpage = "users";
								s.main.database.selectedUserID = creatorID;
							}
						}} />
					<Text>)</Text>
				</Row>
			</Column>
		);
	}
}