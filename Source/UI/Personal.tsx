import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Button} from "react-vcomponents";
import {Row} from "react-vcomponents";
import {Column} from "react-vcomponents";
import {Connect} from "../Frame/Database/FirebaseConnect";
import {MapType, Map} from "../Store/firebase/maps/@Map";
import { GetMaps } from "Store/firebase/maps";
import MapEntryUI from "./@Shared/Maps/MapEntryUI";
import {GetUserPermissionGroups, GetUserID} from "Store/firebase/users";
import {PermissionGroupSet} from "../Store/firebase/userExtras/@UserExtraInfo";
import {ShowSignInPopup} from "./@Shared/NavBar/UserPanel";
import {ShowAddMapDialog} from "./@Shared/Maps/AddMapDialog";
import {ScrollView} from "react-vscrollview";
import {GetSelectedDebateMapID, GetSelectedDebateMap} from "../Store/main/debates";
import MapUI from "./@Shared/Maps/MapUI";
import { GetSelectedPersonalMap } from "Store/main/personal";
import {columnWidths} from "UI/Debates";
import {Div} from "react-vcomponents";

type Props = {} & Partial<{permissions: PermissionGroupSet, maps: Map[], selectedMap: Map}>;
@Connect((state, props)=> ({
	permissions: GetUserPermissionGroups(GetUserID()),
	maps: GetMaps().filter(a=>a.type == MapType.Personal),
	selectedMap: GetSelectedPersonalMap(),
}))
export default class PersonalUI extends BaseComponent<Props, {}> {
	render() {
		let {permissions, maps, selectedMap} = this.props;
		let userID = GetUserID();

		if (selectedMap) {
			return <MapUI map={selectedMap}/>;
		}

		maps = maps.OrderByDescending(a=>a.edits);

		return (
			<Column style={{width: 960, margin: "20px auto 20px auto", flex: 1, filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
				<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					<Row style={{height: 40, padding: 10}}>
						<Button text="Add map" ml="auto" onClick={()=> {
							if (userID == null) return ShowSignInPopup();
							ShowAddMapDialog(userID, MapType.Personal);
						}}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>
					</Row>
				</Column>
				<ScrollView style={{flex: 1}} contentStyle={{flex: 1}}>
					{maps.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{maps.map((map, index)=> {
						return <MapEntryUI key={index} index={index} last={index == maps.length - 1} map={map}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}