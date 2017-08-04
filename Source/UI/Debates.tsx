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

export const columnWidths = [.6, .1, .12, .18];

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

		maps = maps.OrderByDescending(a=>a.edits);

		return (
			<Column style={{width: 960, margin: "20px auto 20px auto", height: "calc(100% - 40px)", filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)"}}>
				<Column className="clickThrough" style={{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
					<Row style={{height: 40, padding: 10}}>
						{/*<Row width={200} style={{position: "absolute", left: "calc(50% - 100px)"}}>
							<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
								enabled={page > 0} onClick={()=> {
									//store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
								}}/>
							<Div ml={10} mr={7}>Page: </Div>
							<TextInput mr={10} pattern="[0-9]+" style={{width: 30}} value={page + 1}
								onChange={val=> {
									if (!IsNumberString(val)) return;
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage)}))
								}}/>
							<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
								enabled={page < lastPage} onClick={()=> {
									store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page + 1}));
								}}/>
						</Row>
						<Div mlr="auto"/>
						<Pre>Filter:</Pre>
						<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
						<TextInput ml={2} value={filter} onChange={val=>store.dispatch(new ACTMapNodeListFilterSet({mapID: map._id, filter: val}))}/>*/}
						<Button text="Add debate" ml="auto" onClick={()=> {
							if (userID == null) return ShowSignInPopup();
							ShowAddMapDialog(userID, MapType.Debate);
						}}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>
					</Row>
				</Column>
				<ScrollView contentStyle={{flex: 1}}>
					{maps.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{maps.map((map, index)=> {
						return <MapEntryUI key={index} index={index} last={index == maps.length - 1} map={map}/>;
					})}
				</ScrollView>
			</Column>
		);
	}
}