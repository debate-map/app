import {VReactMarkdown_Remarkable, YoutubePlayerUI, ParseYoutubeVideoID, HTMLProps_Fixed} from "web-vcore";
import {NodeL2, ReferencesAttachment, QuoteAttachment, MediaAttachment, GetMedia, MediaType, GetExpandedByDefaultAttachment, GetAttachmentType, DescriptionAttachment, GetSubPanelAttachments} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import React, {useState} from "react";
import {Button, Row} from "react-vcomponents";
import {E, ModifyString} from "js-vextensions";
import {ButtonChain} from "Utils/ReactComponents/ButtonChain.js";
import {SourcesUI} from "./SourcesUI.js";
import {observer_mgl} from "mobx-graphlink";

export type SubPanel_Props = {
	node: NodeL2,
	toolbarShowing: boolean
} & HTMLProps_Fixed<"div">;

export const SubPanel = observer_mgl((props: SubPanel_Props)=>{
	const {node, toolbarShowing, ...rest} = props;
	const attachments_forSubPanel = GetSubPanelAttachments(node.current);
	const indexOfExpandedByDefaultAttachment = attachments_forSubPanel.findIndex(a=>a == GetExpandedByDefaultAttachment(node.current));
	const [selectedAttachmentIndex, setSelectedAttachmentIndex] = useState(indexOfExpandedByDefaultAttachment);
	const currentAttachment = attachments_forSubPanel[selectedAttachmentIndex];

	return (
		<>
			{(attachments_forSubPanel.length > 1 || (attachments_forSubPanel.length == 1 && indexOfExpandedByDefaultAttachment == -1)) &&
			<Row mb={5} p="0 5px" style={{position: "relative", flexWrap: "wrap", gap: 5}}>
				{attachments_forSubPanel.map((attachment, index)=>{
					const attachmentType = GetAttachmentType(attachment);
					const thisAttachmentSelected = selectedAttachmentIndex == index;
					return (
						<ButtonChain key={index} selected={thisAttachmentSelected}>
							<Button text={`${index + 1}: ${ModifyString(attachmentType, m=>[m.startLower_to_upper])}`}
								style={E(
									{padding: "3px 7px"},
								)}
								onClick={()=>{
									setSelectedAttachmentIndex(selectedAttachmentIndex != index ? index : -1);
								}}/>
						</ButtonChain>
					);
				})}
			</Row>}
			{currentAttachment != null &&
			<div {...rest} style={{
				position: "relative",
				padding: `${currentAttachment?.references ? 0 : 6}px 5px 5px 5px`,
				background: liveSkin.NodeSubPanelBackgroundColor().css(), borderRadius: "0 0 0 5px",
				fontSize: 12, // text within attachments can get really long; make font smaller to avoid visual space being dominated by attachment text
			}}>
				{currentAttachment?.references &&
					<SubPanel_References attachment={currentAttachment?.references}/>}
				{currentAttachment?.quote &&
					<SubPanel_Quote attachment={currentAttachment?.quote}/>}
				{currentAttachment?.media &&
					<SubPanel_Media mediaAttachment={currentAttachment?.media}/>}
				{currentAttachment?.description &&
					<SubPanel_Description attachment={currentAttachment?.description}/>}
			</div>}
		</>
	);
});

export const SubPanel_Quote = observer_mgl(({attachment}: {attachment: QuoteAttachment})=>{
	return (
		<div style={{position: "relative", whiteSpace: "initial"}}>
			<VReactMarkdown_Remarkable source={attachment.content}/>
			<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
			<SourcesUI sourceChains={attachment.sourceChains}/>
		</div>
	);
});

export const SubPanel_References = observer_mgl(({attachment}: {attachment: ReferencesAttachment})=>{
	return (
		<div style={{position: "relative", whiteSpace: "initial"}}>
			<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
			<SourcesUI sourceChains={attachment.sourceChains} headerText="References"/>
		</div>
	);
});

export const SubPanel_Media = observer_mgl(({mediaAttachment}: {mediaAttachment: MediaAttachment})=>{
	const media = GetMedia(mediaAttachment.id); // nn: db-ref, bail
	if (media == null) return null;

	const videoID = ParseYoutubeVideoID(media.url);
	return (
		<div style={{position: "relative"}}>
			{media.type === MediaType.image &&
				<img src={media.url} style={{width: mediaAttachment.previewWidth != null ? `${mediaAttachment.previewWidth}%` : undefined, maxWidth: "100%"}}/>}

			{media.type === MediaType.video && <>
				{videoID == null && <div>Invalid YouTube video url: {media.url}</div>}
				{videoID != null && <YoutubePlayerUI videoID={videoID} heightVSWidthPercent={.5625}
					onPlayerInitialized={player=>{
						player.GetPlayerUI().style.position = "absolute";
					}}/>}
			</>}

			<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
			<SourcesUI sourceChains={mediaAttachment.sourceChains}/>
		</div>
	);
});

export const SubPanel_Description = observer_mgl(({attachment}: {attachment: DescriptionAttachment})=>{
	return (
		<div style={{position: "relative", whiteSpace: "initial"}}>
			<VReactMarkdown_Remarkable source={attachment.text}/>
		</div>
	);
});
