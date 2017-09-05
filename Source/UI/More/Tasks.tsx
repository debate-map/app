import {SubNavBarButton} from "./../@Shared/SubNavBar";
import SubNavBar from "./../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "./../../Frame/UI/ReactGlobals";
import VReactMarkdown from "./../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "./../../Frame/UI/GlobalStyles";
import VReactMarkdown_Remarkable from "./../../Frame/ReactComponents/VReactMarkdown_Remarkable";
import Column from "./../../Frame/ReactComponents/Column";
import Row from "Frame/ReactComponents/Row";

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