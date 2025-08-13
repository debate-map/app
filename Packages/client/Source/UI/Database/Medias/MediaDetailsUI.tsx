import {GetAccessPolicy, GetNiceNameForMediaType, Media, MediaType, Media_namePattern, GetFinalAccessPolicyForNewEntry} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUIBaseProps, useDetailsUI} from "UI/@Shared/DetailsUI_Base.js";
import {ES, HSLA, ParseYoutubeVideoID, YoutubePlayerUI} from "web-vcore";
import {E, GetEntries} from "js-vextensions";
import {GetAsync, observer_mgl} from "mobx-graphlink";
import {Button, Column, Pre, Row, RowLR, Select, Span, TextInput} from "react-vcomponents";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {RunCommand_AddMedia} from "Utils/DB/Command.js";
import {PolicyPicker} from "../Policies/PolicyPicker.js";

export type MediaDetailsUIProps = DetailsUIBaseProps<Media, {}>;

export const MediaDetailsUI = observer_mgl((props: MediaDetailsUIProps)=>{
	const {baseData, style, onChange, phase} = props;
	const {newData, helpers, dataError, containerRef} = useDetailsUI<Media>({
		baseData,
		onChange,
		phase
	});
	const {Change, creating, editing} = helpers;

	const videoID = ParseYoutubeVideoID(newData.url);
	const accessPolicy = GetAccessPolicy(newData.accessPolicy);
	const enabled = creating || editing;

	const splitAt = 100;
	return (
		<Column ref={containerRef as any} style={style}>
			{!creating && <GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}

			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Name: </Pre>
				<TextInput
					pattern={Media_namePattern} required
					enabled={enabled} style={{width: "100%"}}
					value={newData.name} onChange={val=>Change(newData.name = val)}/>
			</RowLR>

			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Type: </Pre>
				<Select options={GetEntries(MediaType, name=>GetNiceNameForMediaType(MediaType[name]))} enabled={enabled} style={ES({flex: 1})}
					value={newData.type} onChange={val=>Change(newData.type = val)}/>
			</RowLR>

			<RowLR mt={5} splitAt={splitAt}>
				<Pre>URL: </Pre>
				<TextInput
					enabled={enabled} style={{width: "100%"}} required
					value={newData.url} onChange={val=>Change(newData.url = val)}/>
				{newData.type == MediaType.video && newData.url && videoID == null &&
					<Span ml={5} style={{color: HSLA(30, 1, .6, 1), whiteSpace: "pre"}}>Only YouTube urls supported currently.</Span>}
			</RowLR>

			<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
				<Pre>Description: </Pre>
				<TextInput enabled={enabled} style={ES({flex: 1})} value={newData.description} onChange={val=>Change(newData.description = val)}/>
			</RowLR>

			<Column mt={10}>
				<Row style={{fontWeight: "bold"}}>Preview:</Row>
					{newData.type == MediaType.image &&
						<Row mt={5} style={{display: "flex", alignItems: "center"}}>
							<img src={newData.url} style={{width: "100%"}}/>
						</Row>}
					{newData.type == MediaType.video &&
						// use wrapper div (with video-id as key), to ensure element cleanup when video-id changes
						<div key={videoID}>
							{!videoID && <div>Invalid YouTube video url: {newData.url}</div>}
							{videoID && <YoutubePlayerUI videoID={videoID} /*startTime={0}*/ heightVSWidthPercent={.5625}
								onPlayerInitialized={player=>{
									player.GetPlayerUI().style.position = "absolute";
								}}/>}
						</div>}
			</Column>

			<RowLR mt={5} splitAt={splitAt}>
				<Pre>Access policy: </Pre>
				<PolicyPicker value={newData.accessPolicy} onChange={val=>Change(newData.accessPolicy = val!)}>
					<Button enabled={enabled} text={accessPolicy ? `${accessPolicy.name} (id: ${accessPolicy.id})` : "(click to select policy)"} style={{width: "100%"}}/>
				</PolicyPicker>
			</RowLR>

			{dataError && dataError != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{dataError}</Row>}
		</Column>
	);
})

export async function ShowAddMediaDialog(initialData?: Partial<Media>, postAdd?: (id: string)=>void) {
	const prep = await GetAsync(()=>{
		return {accessPolicy: GetFinalAccessPolicyForNewEntry(null, null, "medias")};
	});

	let newEntry = new Media(E({
		accessPolicy: prep.accessPolicy.id,
		name: "",
		type: MediaType.image,
		description: "",
	}, initialData));

	const boxController: BoxController = ShowMessageBox({
		title: "Add media", cancelButton: true,
		message: observer_mgl(()=>{
			return (
				<Column style={{padding: "10px 0", width: 600}}>
					<MediaDetailsUI baseData={newEntry} phase="create"
						onChange={(val, error)=>{
							newEntry = val;
							boxController.UpdateUI();
						}}/>
				</Column>
			);
		}),
		onOK: async()=>{
			const {id} = await RunCommand_AddMedia(newEntry);
			if (postAdd) postAdd(id);
		},
	});
}
