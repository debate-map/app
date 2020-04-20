import {E} from "js-vextensions";
import {runInAction} from "mobx";
import {Button, Column, Row, Select} from "react-vcomponents";
import {BaseComponentPlus, UseCallback} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {store} from "Source/Store";
import {GetSelectedPrivateMap} from "Source/Store/main/private";
import {GetSelectedPublicMap} from "Source/Store/main/public";
import {ES} from "Source/Utils/UI/GlobalStyles";
import {HSLA, Observer, PageContainer} from "vwebapp-framework";
import {MapType,MeID,GetUserPermissionGroups, CanGetBasicPermissions,GetMaps_Private, GetMaps_Public} from "@debate-map/server-link/Source/Link";
import {GADDemo} from "../../@GAD/GAD";
import {ShowAddMapDialog} from "../../@Shared/Maps/AddMapDialog";
import {MapEntryUI} from "../../@Shared/Maps/MapEntryUI";
import {MapUI} from "../../@Shared/Maps/MapUI";
import {ShowSignInPopup} from "../../@Shared/NavBar/UserPanel";




export const columnWidths = [0.64, 0.06, 0.12, 0.18];

@Observer
export class MapListUI extends BaseComponentPlus({} as {type: MapType}, {}) {
	render() {
		const {type} = this.props;
		const userID = MeID();
		const permissions = GetUserPermissionGroups(userID);
		const storeNode = store.main[type == MapType.Private ? "private" : "public"];
		const maps = type == MapType.Private ? GetMaps_Private(true) : GetMaps_Public(true);
		// maps = maps.OrderByDescending(a => ToNumber(a.edits, 0));
		const featuredMaps = maps.filter(a=>a.featured);
		const mapsToShow = storeNode.listType == "featured" ? featuredMaps : maps;

		const selectedMap = type == MapType.Private ? GetSelectedPrivateMap() : GetSelectedPublicMap();
		if (selectedMap) {
			return (
				<PageContainer preset="full" style={{margin: 0}}>
					<MapUI map={selectedMap}/>
				</PageContainer>
			);
		}

		const listTypeOptions = [{name: `Featured (${featuredMaps.length})`, value: "featured"}, {name: `All (${maps.length})`, value: "all"}];
		return (
			<PageContainer style={{margin: "20px auto 20px auto", padding: 0, background: null}}>
				<Column className="clickThrough" style={E(
					{height: 80, background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"},
					GADDemo && {
						background: "rgba(222,222,222,1)", color: HSLA(221, 0.13, 0.42, 1),
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17, fontWeight: "bold",
					},
				)}>
					<Row style={{height: 40, padding: 10}}>
						<Select displayType="button bar" options={listTypeOptions} value={storeNode.listType} onChange={val=>{
							runInAction("MapListUI.listTypeBar.onChange", ()=>storeNode.listType = val);
						}}/>
						<Button text="Add map" ml="auto" enabled={CanGetBasicPermissions(MeID())} onClick={UseCallback(()=>{
							if (userID == null) return void ShowSignInPopup();
							ShowAddMapDialog(userID, type);
						}, [type, userID])}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						{!GADDemo && <span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>}
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1})}>
					{mapsToShow.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{mapsToShow.map((map, index)=><MapEntryUI key={index} index={index} last={index == mapsToShow.length - 1} map={map}/>)}
				</ScrollView>
			</PageContainer>
		);
	}
}