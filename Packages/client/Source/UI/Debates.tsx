import {BaseComponentPlus, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {CanGetBasicPermissions, GetMaps, GetUser, HasAdminPermissions, MeID} from "dm_common";
import {store} from "Store";
import {GetSelectedDebatesPageMap, GetSelectedDebatesPageMapID} from "Store/main/debates";
import {ES, HSLA, Observer, PageContainer, RunInAction} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Button, Column, Row, Select} from "web-vcore/nm/react-vcomponents.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import React from "react";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetCinzelStyleForBold} from "Utils/Styles/Skins/SLSkin";
import {MapUI} from "./@Shared/Maps/MapUI";
import {GADDemo, GADDemo_AI, GetAIPrefixInfoFromMapName} from "./@GAD/GAD";
import {ShowSignInPopup} from "./@Shared/NavBar/UserPanel";
import {MapEntryUI} from "./Debates/MapEntryUI";
import {ShowAddMapDialog} from "./@Shared/Maps/MapDetailsUI";

@Observer
export class DebatesUI extends BaseComponentPlus({} as {}, {}) {
	render() {
		const selectedMapID = GetSelectedDebatesPageMapID();
		if (selectedMapID) {
			return (
				<PageContainer preset="full" style={{margin: 0}}>
					<MapUI mapID={selectedMapID}/>
				</PageContainer>
			);
		}

		return (
			<PageContainer style={{margin: "20px auto 20px auto", padding: 0, background: null}}>
				<MapListUI/>
			</PageContainer>
		);
	}
}

export const columnWidths = [0.64, 0.06, 0.12, 0.18];

@Observer
export class MapListUI extends BaseComponentPlus({}, {}) {
	render() {
		const userID = MeID();
		const uiState = store.main.debates;

		let maps = GetMaps(true);
		if (GADDemo_AI) {
			maps = maps
				.filter(a=>{
					if (!a.name.toLowerCase().startsWith("[ai")) return false;
					const creator = GetUser(a.creator);
					if (!creator?.permissionGroups.admin) return false;
					return true;
				})
				.OrderBy(a=>{
					const [matchStr, orderingNumber] = GetAIPrefixInfoFromMapName(a.name);
					return orderingNumber != null ? Number(orderingNumber) : 0;
				});
		}

		const maps_featured = maps.filter(a=>a.featured);
		const maps_finalToShow = uiState.listType == "featured" ? maps_featured : maps;

		const listTypeOptions = [{name: `Featured (${maps_featured.length})`, value: "featured"}, {name: `All (${maps.length})`, value: "all"}];
		return (
			<>
				<Column className="clickThrough" style={E(
					{height: 80, background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"},
					GADDemo && {
						color: HSLA(221, 0.13, 0.42, 1),
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17,
					},
					GADDemo && GetCinzelStyleForBold(),
				)}>
					<Row style={{height: 40, padding: 10}}>
						<Select displayType="button bar" options={listTypeOptions} value={uiState.listType} onChange={val=>{
							RunInAction("MapListUI.listTypeBar.onChange", ()=>uiState.listType = val);
						}}/>
						<Button text="Add map" ml="auto" enabled={GADDemo ? HasAdminPermissions(MeID()) : CanGetBasicPermissions(MeID())} onClick={UseCallback(()=>{
							if (userID == null) return void ShowSignInPopup();
							ShowAddMapDialog();
						}, [userID])}/>
					</Row>
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						{!GADDemo && <span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>}
						{!GADDemo_AI && <span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>}
						{!GADDemo_AI && <span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>}
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
				})}>
					{maps_finalToShow.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>No results.</div>}
					{maps_finalToShow.map((map, index)=><MapEntryUI key={index} index={index} last={index == maps_finalToShow.length - 1} map={map}/>)}
				</ScrollView>
			</>
		);
	}
}