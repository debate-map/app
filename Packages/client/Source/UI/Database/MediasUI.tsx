import {Button, Column, Div, Pre, Row, Span, Text} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {store} from "Store";
import {GetSelectedMedia, GetSelectedMediaID} from "Store/main/database";
import {GetUpdates, ES, RunInAction, chroma_maxDarken} from "web-vcore";
import {Assert, E} from "js-vextensions";
import {Media, GetNiceNameForMediaType, HasModPermissions, MeID, GetMedias, PERMISSIONS} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {RunCommand_DeleteMedia, RunCommand_UpdateMedia} from "Utils/DB/Command.js";
import {MediaDetailsUI, ShowAddMediaDialog} from "./Medias/MediaDetailsUI.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";
import React, {useEffect, useRef, useState} from "react";
import {observer_mgl} from "mobx-graphlink";

export const MediasUI = observer_mgl(()=>{
	const [selectedMedia_newData, setSelectedMediaNewData] = useState<Media|n>(null);
	const [selectedMedia_newDataError, setSelectedMediaNewDataError] = useState<string|n>(null);

	const userID = MeID();
	const medias = GetMedias();
	const selectedMedia = GetSelectedMedia();
	const permissionsModify = selectedMedia != null && PERMISSIONS.Media.Modify(userID, selectedMedia);
	const permissionsDelete = selectedMedia != null && PERMISSIONS.Media.Delete(userID, selectedMedia);

	const scrollViewRef = useRef<any>(null);

	useEffect(()=>{
		setSelectedMediaNewData(null);
		setSelectedMediaNewDataError(null);
	}, [selectedMedia]);

	if (medias == null) return <div>Loading media...</div>;

	return (
		<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
			<Column mtb={10} style={{
				position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
				background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10,
			}}>
				<Row center style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
					<div style={{padding: 7, position: "absolute", left: 0}}>
						<Button text="Add media" enabled={HasModPermissions(MeID())} title={HasModPermissions(MeID()) ? null : "Only moderators can add media currently. (till review/approval system is implemented)"}onClick={e=>{
							if (userID == null) return ShowSignInPopup();
							ShowAddMediaDialog({});
						}}/>
					</div>
					<div style={{fontSize: 17, fontWeight: 500}}>
						Media
					</div>
				</Row>
					<ScrollView ref={scrollViewRef} style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						RunInAction("MediasUI.ScrollView.onClick", ()=>store.main.database.selectedMediaID = null);
					}}>
						{medias.map((media, index)=><MediaUI key={index} first={index == 0} image={media} selected={GetSelectedMediaID() == media.id}/>)}
					</ScrollView>
			</Column>
			 <ScrollView ref={scrollViewRef} style={{position: "absolute", left: "60%", right: 0, height: "100%"}} contentStyle={ES({flex: 1, padding: 10})}>
				<Column style={{position: "relative", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10}}>
					<Row style={{height: 40, justifyContent: "center", background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
						{selectedMedia
							&& <Text style={{fontSize: 17, fontWeight: 500}}>
								{selectedMedia.name}
							</Text>}
						<Div p={7} style={{position: "absolute", right: 0}}>
							{permissionsModify &&
								<Button ml="auto" text="Save details" enabled={selectedMedia_newData != null && selectedMedia_newDataError == null}
									onClick={async()=>{
										Assert(selectedMedia); // nn: button would be disabled otherwise
										const updates = GetUpdates(selectedMedia, selectedMedia_newData);
										await RunCommand_UpdateMedia({id: selectedMedia.id, updates});
									}}/>}
							{permissionsDelete &&
								<Button text="Delete media" ml={10} enabled={selectedMedia != null} onClick={async()=>{
									Assert(selectedMedia); // nn: button would be disabled otherwise
									ShowMessageBox({
										title: `Delete "${selectedMedia.name}"`, cancelButton: true,
										message: `Delete the media "${selectedMedia.name}"?`,
										onOK: async()=>{
											await RunCommand_DeleteMedia({id: selectedMedia.id});
										},
									});
								}}/>}
						</Div>
					</Row>
					{selectedMedia
						? <MediaDetailsUI baseData={selectedMedia} phase={permissionsModify ? "edit" : "view"} style={{padding: 10}}
							onChange={(data, error)=>{
								setSelectedMediaNewData(data);
								setSelectedMediaNewDataError(error);
							}}/>
						: <div style={{padding: 10}}>No media selected.</div>}
				</Column>
			</ScrollView>
		</Row>
	)
})

export const MediaUI = (({image, first, selected}:{image: Media, first: boolean, selected: boolean})=>{
	return (
		<Row mt={first ? 0 : 5} className="cursorSet"
			style={E(
				{padding: 5, background: liveSkin.BasePanelBackgroundColor().darken(.05 * chroma_maxDarken).css(), borderRadius: 5, cursor: "pointer"},
				selected && {background: liveSkin.BasePanelBackgroundColor().darken(.1 * chroma_maxDarken).css()},
			)}
			onClick={()=>{
				RunInAction("MediaUI.onClick", ()=>store.main.database.selectedMediaID = image.id);
			}}>
			<div>
				<Pre>{image.name}: </Pre>
				{image.description.KeepAtMost(100)}
			</div>
			<Span ml="auto">
				<Pre style={{opacity: 0.7}}>({GetNiceNameForMediaType(image.type)}) </Pre>
				<Pre>#{image.id.slice(0, 4)}</Pre>
			</Span>
		</Row>
	);
})
