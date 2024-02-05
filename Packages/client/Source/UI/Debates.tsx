import {CanGetBasicPermissions, GetMaps, GetUser, HasAdminPermissions, MeID, Map} from "dm_common";
import React, {useState} from "react";
import {store} from "Store";
import {GetSelectedDebatesPageMapID} from "Store/main/debates";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetCinzelStyleForBold} from "Utils/Styles/Skins/SLSkin";
import {ES, HSLA, Observer, PageContainer, RunInAction} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Button, Text, Column, Row, Select, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, UseCallback} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {SLMode, SLMode_AI, GetAIPrefixInfoFromMapName, SLMode_Main} from "./@SL/SL";
import {ShowAddMapDialog} from "./@Shared/Maps/MapDetailsUI";
import {MapUIWrapper} from "./@Shared/Maps/MapUIWrapper";
import {ShowSignInPopup} from "./@Shared/NavBar/UserPanel";
import {MapEntryUI} from "./Debates/MapEntryUI";

@Observer
export class DebatesUI extends BaseComponent<{}, {}> {
	render() {
		const selectedMapID = GetSelectedDebatesPageMapID();
		if (selectedMapID) {
			return (
				<PageContainer preset="full" style={{margin: 0}}>
					<MapUIWrapper mapID={selectedMapID}/>
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
		if (SLMode_Main) {
			maps = maps
				.filter(a=>{
					const creator = GetUser(a.creator);
					if (creator?.permissionGroups.admin) return false;
					return true;
				});
		}
		if (SLMode_AI) {
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
		let listType = uiState.listType;
		// if in sl-mode, some modes may not have any featured maps; in those cases, set/lock list-type to "all" so user doesn't see an empty list (since default list-type is "featured")
		if (SLMode && maps_featured.length == 0) {
			listType = "all";
		}
		const maps_toShow_preFilter = listType == "featured" ? maps_featured : maps;
		const [filter, setFilter] = useState("");
		const maps_toShow_final = ApplyMapListFilter(maps_toShow_preFilter, filter);
		const maps_nonFeatured_postFilter = ApplyMapListFilter(maps.filter(a=>!a.featured), filter);

		const listTypeOptions = [{name: `Featured (${maps_featured.length})`, value: "featured"}, {name: `All (${maps.length})`, value: "all"}];
		return (
			<>
				<Column className="clickThrough" style={E(
					{background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"},
					SLMode && {
						color: HSLA(221, 0.13, 0.42, 1),
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", fontSize: 17,
					},
					SLMode && GetCinzelStyleForBold(),
				)}>
					<Row mt={10} p="0 10px">
						<Select displayType="button bar" options={listTypeOptions} value={listType} onChange={val=>{
							RunInAction("MapListUI.listTypeBar.onChange", ()=>uiState.listType = val);
						}}/>
						<Text ml={5}>Filter:</Text>
						<TextInput ml={5} style={{width: 200}} instant value={filter} onChange={val=>setFilter(val)}/>
						<Button text="Add map" ml="auto"
							enabled={SLMode && !SLMode_Main ? HasAdminPermissions(MeID()) : CanGetBasicPermissions(MeID())} // in sl-mode, only admins can add maps (except "main" sl-mode, which wants user-contributed maps)
							onClick={UseCallback(()=>{
								if (userID == null) return void ShowSignInPopup();
								ShowAddMapDialog();
							}, [userID])}/>
					</Row>
					<Row mt={10} p="0 10px" style={{height: 30}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						{!SLMode && <span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Edits</span>}
						{!SLMode_AI && <span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Last edit</span>}
						{!SLMode_AI && <span style={{flex: columnWidths[3], fontWeight: 500, fontSize: 17}}>Creator</span>}
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={ES({
					flex: 1, background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: "0 0 10px 10px",
				})}>
					{maps_toShow_final.length == 0 && <div style={{textAlign: "center", fontSize: 18}}>{[
						`No results.`,
						listType == "featured" && maps_nonFeatured_postFilter.length > 0 && ` (+${maps_nonFeatured_postFilter.length} results in "All")`,
					].filter(a=>a).join("")}</div>}
					{maps_toShow_final.map((map, index)=><MapEntryUI key={index} index={index} last={index == maps_toShow_final.length - 1} map={map}/>)}
				</ScrollView>
			</>
		);
	}
}
function ApplyMapListFilter(maps: Map[], filterStr: string) {
	return maps.filter(a=>filterStr.length == 0 || a.name.toLowerCase().includes(filterStr.toLowerCase()));
}