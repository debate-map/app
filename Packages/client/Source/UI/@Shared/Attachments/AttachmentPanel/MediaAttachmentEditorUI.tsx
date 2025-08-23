import {E} from "js-vextensions";
import {Column, Pre, Spinner, TextInput, Row, DropDown, DropDownTrigger, Button, DropDownContent, Text, CheckBox} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {MediaAttachment, GetMedia, GetMediasByURL, HasModPermissions, MeID, GetUser, Media, AttachmentTarget} from "dm_common";
import {Validate} from "mobx-graphlink";
import {Link, Observer, InfoButton} from "web-vcore";
import {ShowAddMediaDialog} from "UI/Database/Medias/MediaDetailsUI.js";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {SourceChainsEditorUI} from "../../Maps/Node/SourceChainsEditorUI.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

@Observer
export class MediaAttachmentEditorUI extends DetailsUI_Base<MediaAttachment, MediaAttachmentEditorUI, {target: AttachmentTarget}> {
	scrollView: ScrollView;
	render() {
		const {style, target} = this.props;
		const {newData} = this.state;
		const {enabled, Change} = this.helpers;
		const image = Validate("UUID", newData.id) == null ? GetMedia(newData.id) : null;

		return (
			<Column style={style}>
				<Row>
					<TextInput placeholder="Media ID or URL..." enabled={enabled} style={{width: "100%", borderRadius: "5px 5px 0 0"}}
						value={newData.id} onChange={val=>Change(newData.id = val)}/>
				</Row>
				<Row style={{position: "relative", flex: 1}}>
					<DropDown style={{flex: 1}}>
						<DropDownTrigger>
							<Button style={{height: "100%", borderRadius: "0 0 5px 5px", display: "flex", whiteSpace: "normal", padding: 5}}
								text={image
									? `${image.name}: ${image.url}`
									: `(click to search/create)`}/>
						</DropDownTrigger>
						<DropDownContent style={{zIndex: zIndexes.dropdown, left: 0, width: 600, borderRadius: "0 5px 5px 5px", padding: image ? 10 : 0}}><Column>
							{image &&
							<Row>
								<Link style={{marginTop: 5, alignSelf: "flex-start"}} onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
									s.main.page = "database";
									s.main.database.subpage = "media";
									s.main.database.selectedMediaID = image.id;
								}}>
									<Button text="Show details"/>
								</Link>
							</Row>}
							{!image &&
							<Column>
								<MediaSearchOrCreateUI url={newData.id} enabled={enabled} onSelect={id=>Change(newData.id = id)}/>
							</Column>}
						</Column></DropDownContent>
					</DropDown>
				</Row>
				{target == "node" &&
				<Row center mt={5} style={{width: "100%"}}>
					<CheckBox text="Captured" enabled={enabled} value={newData.captured} onChange={val=>Change(newData.captured = val)}/>
					<InfoButton ml={5} text="Whether the image/video is claimed to be a capturing of real-world footage."/>
				</Row>}
				{target == "node" &&
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Preview width:</Pre>
					<Spinner ml={5} max={100} enabled={enabled}
						value={newData.previewWidth ?? 0} onChange={val=>Change(newData.previewWidth = val != 0 ? val : undefined)}/>
					<Pre>% (0 for auto)</Pre>
				</Row>}
				<Row mt={10}>
					<SourceChainsEditorUI ref={c=>{this.chainsEditor = c}} enabled={enabled} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI|n;
	GetValidationError_Extras() {
		return this.chainsEditor?.GetValidationError();
	}
}

type MediaSearchOrCreateUI_Props = {
	url: string,
	enabled: boolean,
	onSelect: (id: string)=>void
};

export const MediaSearchOrCreateUI = observer_mgl((props: MediaSearchOrCreateUI_Props)=>{
	const {url, enabled, onSelect} = props;
	const mediasWithMatchingURL = GetMediasByURL(url);

	return (
		<>
			{mediasWithMatchingURL.length == 0 && <Row style={{padding: 5}}>No media found with the url &quote;{url}&quote;.</Row>}
			{mediasWithMatchingURL.map((media, index)=>{
				return <FoundMediaUI key={media.id} media={media} index={index} enabled={enabled} onSelect={()=>onSelect(media.id)}/>;
			})}
			<Row mt={5} style={{
				background: mediasWithMatchingURL.length % 2 == 0 ? "rgba(30,30,30,.7)" : liveSkin.OverlayPanelBackgroundColor().css(),
				padding: 5, borderRadius: "0 0 5px 5px",
			}}>
				<Button text="Create new image" enabled={enabled && HasModPermissions(MeID())}
					title={HasModPermissions(MeID()) ? undefined : "Only moderators can add media currently. (till review/approval system is implemented)"}
					onClick={()=>{
						ShowAddMediaDialog({url}, onSelect);
					}}/>
			</Row>
		</>
	);

})

type FoundMediaUI_Props = {
	media: Media,
	index: number,
	enabled: boolean,
	onSelect: ()=>void
};

export const FoundMediaUI = observer_mgl((props: FoundMediaUI_Props)=>{
	const {media, index, enabled, onSelect} = props;
	const creator = GetUser(media.creator);

	return (
		<Row center
			style={E(
				{
					whiteSpace: "normal",
					background: index % 2 == 0 ? "rgba(30,30,30,.7)" : liveSkin.OverlayPanelBackgroundColor().css(),
					padding: 5,
				},
				index == 0 && {borderRadius: "5px 5px 0 0"},
			)}
		>
			<Link text={`${media.id}\n(by ${creator?.displayName ?? "n/a"})`} style={{fontSize: 13, whiteSpace: "pre"}}
				onContextMenu={e=>e.nativeEvent["handled"] = true}
				actionFunc={s=>{
					s.main.page = "database";
					s.main.database.subpage = "media";
					s.main.database.selectedMediaID = media.id;
				}}/>
			<Text ml={5} sel style={{fontSize: 13}}>{media.name}</Text>
			<Button ml="auto" text="Select" enabled={enabled} style={{flexShrink: 0}} onClick={onSelect}/>
		</Row>
	);
});
