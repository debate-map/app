import {GetShares, DMap, MeID, Share} from "dm_common";
import {GetEntries, VURL, CopyText} from "js-vextensions";
import {Button, Column, DropDown, DropDownContent, DropDownTrigger, Row, Select, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {store} from "Store";
import {ShareTab} from "Store/main/shareUI.js";
import {RunInAction_Set, GetCurrentURL, InfoButton} from "web-vcore";
import moment from "moment";
import {RunCommand_DeleteShare} from "Utils/DB/Command.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {NewShareUI} from "./ShareDropDown/NewShareUI.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const GetShareShortURL = (share: Share)=>{
	return new VURL(GetCurrentURL().domain, ["s", share?.id ?? "[SHARE_ID]"]);
}

export const GetShareLongURL = (share: Share)=>{
	const share_urlSafeName = share?.name.toLowerCase().replace(/[^A-Za-z0-9-_]/g, "-").replace(/-+/g, "-") ?? null;
	return new VURL(GetCurrentURL().domain, ["s", share ? `${share_urlSafeName}.${share.id}` : "[SHARE_NAME_AND_ID]"]);
}

export const ShareDropDown = observer_mgl(({map}: {map: DMap})=>{
	const uiState = store.main.shareUI;
	if (MeID() == null) return <InfoButton mr={5} style={{alignSelf: "center"}} text="Must sign in to view/create custom shares."/>;

	return (
		<DropDown>
			<DropDownTrigger><Button mr={5} text="Share"/></DropDownTrigger>
			<DropDownContent style={{zIndex: zIndexes.dropdown, position: "fixed", right: 0, width: 700, borderRadius: "0 0 0 5px"}}
				// use render-prop approach here, because NewShareUI can be heavy
				content={()=>(
					<Column>
						<Row mb={5}>
							<Select options={GetEntries(ShareTab, "ui")} displayType="button bar"
								value={uiState.tab} onChange={val=>RunInAction_Set(()=>uiState.tab = val)}/>
						</Row>
						{uiState.tab == ShareTab.allMaps && <SharesListUI filter_mapID={null}/>}
						{uiState.tab == ShareTab.thisMap && <SharesListUI filter_mapID={map.id}/>}
						{uiState.tab == ShareTab.current && <NewShareUI mapID={map.id}/>}
					</Column>
				)}/>
		</DropDown>
	);
});

const columnWidths = [.45, .25, .3];
export const SharesListUI = observer_mgl(({filter_mapID}: {filter_mapID: string|n})=>{
	const shares = GetShares(MeID.NN(), filter_mapID).OrderByDescending(a=>a.createdAt);

	return (
		<>
			<Row style={{height: 40, padding: 10}}>
				<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Name</span>
				<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Created at</span>
				<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Actions</span>
			</Row>
			<ScrollView>
				{shares.map((share, index)=>{
					const share_shortURL = new VURL(GetCurrentURL().domain, ["s", share?.id ?? "[SHARE_ID]"]);
					const share_urlSafeName = share?.name.toLowerCase().replace(/[^A-Za-z0-9-_]/g, "-").replace(/-+/g, "-") ?? null;
					const share_longURL = new VURL(GetCurrentURL().domain, ["s", share ? `${share_urlSafeName}.${share.id}` : "[SHARE_NAME_AND_ID]"]);
					return (
						<Row key={share.id} mt={index == 0 ? 0 : 5}>
							<Text style={{flex: columnWidths[0]}}>{share.name}</Text>
							<Text style={{flex: columnWidths[1]}}>{moment(share.createdAt).format("YYYY-MM-DD HH:mm:ss")}</Text>
							<Row style={{flex: columnWidths[2], whiteSpace: "pre"}}>
								<Button ml={5} p="5px 10px" text="Short link" onClick={()=>{
									CopyText(GetShareShortURL(share).toString({domain: true}));
								}}/>
								<Button ml={5} p="5px 10px" text="Long link" onClick={()=>{
									CopyText(GetShareLongURL(share).toString({domain: true}));
								}}/>
								<Button ml={5} p="5px 7px" text="X" onClick={()=>{
									ShowMessageBox({
										title: `Delete share "${share.name}"`, cancelButton: true,
										message: `Delete the share named "${share.name}"?`,
										onOK: async()=>{
											await RunCommand_DeleteShare({id: share.id});
										},
									});
								}}/>
							</Row>
						</Row>
					);
				})}
			</ScrollView>
		</>
	);
})
