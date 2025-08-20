import {GetMap, GetShares, MeID, Share, ShareType, Timeline} from "dm_common";
import {store} from "Store";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {ExpandType, ScrollToType} from "Store/main/shareUI.js";
import {RunCommand_AddShare, RunCommand_UpdateShare} from "Utils/DB/Command.js";
import {RunInAction_Set} from "web-vcore"; import {CopyText, GetEntries, ToJSON, WaitXThenRun} from "js-vextensions";
import {Button, CheckBox, Column, Pre, Row, RowLR, Select, Text, TextArea, TextInput} from "react-vcomponents";
import {GetShareLongURL, GetShareShortURL} from "../ShareDropDown.js";
import {observer_mgl} from "mobx-graphlink";
import React, {useState} from "react";

export const NewShareUI = observer_mgl(({mapID}: {mapID: string})=>{
	const [timeline, setTimeline] = useState<Timeline|n>(null);
	const [justCopied_type, setJustCopied_type] = useState<string|n>(null);

	const uiState = store.main.shareUI;
	const userSharesForMap = GetShares(MeID.NN(), mapID);

	const currentShare = userSharesForMap.OrderByDescending(a=>a.createdAt)[0];
	const currentShare_shortURL = GetShareShortURL(currentShare);
	const currentShare_longURL = GetShareLongURL(currentShare);

	const map = GetMap.NN(mapID);
	const newShareData = new Share({
		name: map.name,
		type: ShareType.map,
		mapID,
		mapView: GetMapView(mapID),
	});
	Object.defineProperty(newShareData, "createdAt", {enumerable: false, value: Date.now()}); // overridden by server, but added for informational convenience, for mere copy-pastes

	const newShareJSON = ToJSON(newShareData, undefined, 2);
	const newShare_updatesFromCurrent = {};
	if (currentShare) {
		const currentMapView_normalized = currentShare.mapView;
		const newMapView_normalized = newShareData.mapView;
		if (ToJSON(newMapView_normalized) != ToJSON(currentMapView_normalized)) {
			newShare_updatesFromCurrent["mapView"] = newShareData.mapView;
		}
	}

	const splitAt = 120;

	return (
		<Column>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Expand type:</Text>
				<Select options={GetEntries(ExpandType, "ui")} value={uiState.expandType} onChange={val=>RunInAction_Set(()=>uiState.expandType = val)}/>
			</RowLR>
			<RowLR mt={5} splitAt={splitAt}>
				<Text>Scroll-to type:</Text>
				<Select options={GetEntries(ScrollToType, "ui")} value={uiState.scrollToType} onChange={val=>RunInAction_Set(()=>uiState.scrollToType = val)}/>
			</RowLR>
			<Row mt={5}>
				<CheckBox text="Show new JSON" value={uiState.showJSON} onChange={val=>RunInAction_Set(()=>uiState.showJSON = val)}/>
			</Row>
			{uiState.showJSON &&
			<Row>
				<TextArea style={{height: 200, resize: "vertical"}} editable={false} value={newShareJSON}/>
			</Row>}
			<Row mt={5}>
				<Button text="Update current" enabled={currentShare != null && newShare_updatesFromCurrent.VKeys().length > 0} onClick={async()=>{
					await RunCommand_UpdateShare({id: currentShare.id, updates: newShare_updatesFromCurrent});
				}}/>
				<Button ml={5} text="Create new share" onClick={async()=>{
					const share = new Share(newShareData);
					await RunCommand_AddShare(share);
				}}/>
				<Text ml={5}>Changes: {currentShare == null ? "n/a" : (newShare_updatesFromCurrent.VKeys().length ? newShare_updatesFromCurrent.VKeys().join(", ") : "none")}</Text>
			</Row>

			{currentShare &&
			<>
				<Row mt={15}>
					<Text>Current share ID: {currentShare?.id ?? "none"}</Text>
				</Row>
				<RowLR mt={5} splitAt={80}>
					<Text>Name:</Text>
					<TextInput enabled={currentShare != null} style={{flex: 1}} value={currentShare?.name ?? ""} onChange={async val=>{
						await RunCommand_UpdateShare({id: currentShare.id, updates: {name: val}});
					}}/>
				</RowLR>
				<RowLR mt={5} splitAt={80}>
					<Pre>Short URL: </Pre>
					<Row style={{width: "100%"}}>
						<TextInput value={currentShare_shortURL.toString({domain: true})} editable={false} style={{flex: 1}}/>
						<Button text={justCopied_type == "short" ? "Copied!" : "Copy"} ml={5} enabled={currentShare != null} onClick={()=>{
							CopyText(currentShare_shortURL.toString({domain: true}));
							setJustCopied_type("short");
							WaitXThenRun(1000, ()=>setJustCopied_type(null));
						}}/>
					</Row>
				</RowLR>
				<RowLR mt={5} splitAt={80}>
					<Pre>Long URL: </Pre>
					<Row style={{width: "100%"}}>
						<TextInput value={currentShare_longURL.toString({domain: true})} editable={false} style={{flex: 1}}/>
						<Button text={justCopied_type == "long" ? "Copied!" : "Copy"} ml={5} enabled={currentShare != null} onClick={()=>{
							CopyText(currentShare_longURL.toString({domain: true}));
							setJustCopied_type("long");
							WaitXThenRun(1000, ()=>setJustCopied_type(null));
						}}/>
					</Row>
				</RowLR>
			</>}
		</Column>
	);
});
