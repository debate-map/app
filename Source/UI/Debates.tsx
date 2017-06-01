import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";
import Button from "Frame/ReactComponents/Button";
import Row from "Frame/ReactComponents/Row";
import Column from "../Frame/ReactComponents/Column";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {MapType, Map} from "../Store/firebase/maps/@Map";
import { GetMaps } from "Store/firebase/maps";
import MapEntryUI from "./@Shared/Maps/MapEntryUI";
import {GetUserPermissionGroups, GetUserID} from "Store/firebase/users";
import {PermissionGroupSet} from "../Store/firebase/userExtras/@UserExtraInfo";
import {ShowSignInPopup} from "./@Shared/NavBar/UserPanel";
import {ShowAddMapDialog} from "./@Shared/Maps/AddMapDialog";
import ScrollView from "react-vscrollview";
import {URL, GetCurrentURL} from "../Frame/General/URLs";
import {GetSelectedDebateMapID, GetSelectedDebateMap} from "../Store/main/debates";
import MapUI from "./@Shared/Maps/MapUI";

type Props = {} & Partial<{permissions: PermissionGroupSet, maps: Map[], selectedMap: Map}>;
@Connect((state, props)=> ({
	permissions: GetUserPermissionGroups(GetUserID()),
	maps: GetMaps().filter(a=>a.type == MapType.Debate),
	selectedMap: GetSelectedDebateMap(),
	//url: GetCurrentURL(),
}))

export default class DebatesUI extends BaseComponent<Props, {}> {
	render() {
		let {permissions, maps, selectedMap} = this.props;
		let userID = GetUserID();

		if (selectedMap) {
			return <MapUI map={selectedMap}/>;
		}

		return (
			<Column style={styles.page}>
				<Row>
					{/*<Button text="Latest"/>*/}
					<Button text="Add debate" ml="auto" onClick={()=> {
						if (userID == null) return ShowSignInPopup();
						ShowAddMapDialog(userID, MapType.Debate);
					}}/>
				</Row>
				<ScrollView style={{/*marginTop: 10,*/ flex: `1 1 100%`}} scrollVBarStyle={{width: 10}}>
					{maps.map((map, index)=> {
						return <MapEntryUI key={index} map={map}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}