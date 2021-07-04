import {E} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Column, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {GetSelectedDebatesPageMap} from "Store/main/debates";
import {ES, HSLA, Observer, PageContainer} from "web-vcore";
import {MapType, MeID, GetUserPermissionGroups, CanGetBasicPermissions, GetMaps_Private, GetMaps_Public, IsUserCreatorOrMod, GetMaps} from "dm_common";
import {GADDemo} from "../../@GAD/GAD.js";
import {ShowAddMapDialog} from "../../@Shared/Maps/AddMapDialog.js";
import {MapEntryUI} from "../../@Shared/Maps/MapEntryUI.js";
import {MapUI} from "../../@Shared/Maps/MapUI.js";
import {ShowSignInPopup} from "../../@Shared/NavBar/UserPanel.js";


export const columnWidths = [0.64, 0.06, 0.12, 0.18];

@Observer
export class MapListUI extends BaseComponentPlus({}, {}) {
	render() {
		//const {type} = this.props;
		const userID = MeID();
		//const permissions = GetUserPermissionGroups(userID);
		const storeNode = store.main.debates;
		//const maps_allOfType = (type == MapType.private ? GetMaps_Private(true) : GetMaps_Public(true));
		const maps_allOfType = GetMaps(true).filter(a=>a);
		const maps_visible = maps_allOfType.filter(map=>{
			/*if (map.visibility == MapVisibility.Unlisted) {
				const creatorOrMod = IsUserCreatorOrMod(MeID(), map);
				const mapEditor = map.editors?.includes(MeID()) ?? false;
				if (!creatorOrMod && !mapEditor) return false;
			}*/
			return true;
		});
		// maps = maps.OrderByDescending(a => ToNumber(a.edits, 0));
		const maps_featured = maps_visible.filter(a=>a.featured);
		const maps_toShow = storeNode.listType == "featured" ? maps_featured : maps_visible;

		const selectedMap = GetSelectedDebatesPageMap();
		if (selectedMap) {
			return (
				<PageContainer preset="full" style={{margin: 0}}>
					<MapUI map={selectedMap}/>
				</PageContainer>
			);
		}

		const listTypeOptions = [{name: `Featured (${maps_featured.length})`, value: "featured"}, {name: `All (${maps_visible.length})`, value: "all"}];
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
							ShowAddMapDialog();
						}, [userID])}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						{!GADDemo && <span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>}
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>
						<span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({flex: 1})}>
					{maps_toShow.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>Loading...</div>}
					{maps_toShow.map((map, index)=><MapEntryUI key={index} index={index} last={index == maps_toShow.length - 1} map={map}/>)}
				</ScrollView>
			</PageContainer>
		);
	}
}