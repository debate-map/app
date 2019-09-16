import {Column, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {styles} from "./../../Frame/UI/GlobalStyles";

export default class TasksUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<Row style={styles.page}>
				<Column style={{flex: .5}}>
					<Row style={{fontSize: 18, justifyContent: "center"}}>Developer short-list</Row>
					<Column style={{background: "rgba(0,0,0,.7)"}}>
					</Column>
				</Column>
				<Column style={{flex: .5}}>
					<Row style={{fontSize: 18, justifyContent: "center"}}>Idea pool</Row>
					<Column style={{background: "rgba(0,0,0,.7)"}}>
					</Column>
				</Column>
			</Row>
		);
	}
}