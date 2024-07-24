import {AddMedia, GetAccessPolicy, GetNiceNameForMediaType, GetUserHidden, Media, MediaType, Media_namePattern, MeID, GetFinalAccessPolicyForNewEntry} from "dm_common";
import React from "react";
import {GenericEntryInfoUI} from "UI/@Shared/CommonPropUIs/GenericEntryInfoUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {ES, HSLA, Observer, observer_simple, ParseYoutubeVideoID, YoutubePlayerUI} from "web-vcore";
import {E, GetEntries} from "web-vcore/nm/js-vextensions.js";
import {GetAsync, observer_mgl} from "web-vcore/nm/mobx-graphlink";
import {Button, Column, Pre, Row, RowLR, Select, Span, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {observer} from "web-vcore/nm/mobx-react";
import {RunCommand_AddMedia} from "Utils/DB/Command.js";
import {PolicyPicker} from "../Policies/PolicyPicker.js";
import {store} from "../../../Store/index.js";

@Observer
export class MediaDetailsUI extends DetailsUI_Base<Media, MediaDetailsUI> {
	scrollView: ScrollView;
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData, dataError} = this.state;
		const {Change, creating, editing} = this.helpers;
		const videoID = ParseYoutubeVideoID(newData.url);
		const accessPolicy = GetAccessPolicy(newData.accessPolicy);
		const enabled = creating || editing;

		const splitAt = 100;
		//const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<GenericEntryInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
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
						/*pattern={Media_urlPattern}*/ required
						enabled={enabled} style={{width: "100%"}}
						value={newData.url} onChange={val=>Change(newData.url = val)}/>
					{newData.type == MediaType.video && newData.url && videoID == null &&
						<Span ml={5} style={{color: HSLA(30, 1, .6, 1), whiteSpace: "pre"}}>Only YouTube urls supported currently.</Span>}
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Description: </Pre>
					<TextInput enabled={enabled} style={ES({flex: 1})}
						value={newData.description} onChange={val=>Change(newData.description = val)}/>
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
	}
}

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
	//const getCommand = ()=>new AddMedia({media: newEntry});

	const boxController: BoxController = ShowMessageBox({
		title: "Add media", cancelButton: true,
		message: observer_mgl(()=>{
			/*const tempCommand = getCommand();
			boxController.options.okButtonProps = {
				enabled: tempCommand.Validate_Safe() == null,
				title: tempCommand.ValidateErrorStr,
			};*/

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
			//const {id} = await getCommand().RunOnServer();
			const {id} = await RunCommand_AddMedia(newEntry);
			if (postAdd) postAdd(id);
		},
	});
}