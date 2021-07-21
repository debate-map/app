import {GetEntries, GetErrorMessagesUnderElement, Clone, CloneWithPrototypes} from "web-vcore/nm/js-vextensions.js";
import Moment from "web-vcore/nm/moment";
import {Column, Div, Pre, Row, RowLR, Select, Spinner, TextInput, CheckBox, Text, Span} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, GetDOM, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {IDAndCreationInfoUI} from "UI/@Shared/CommonPropUIs/IDAndCreationInfoUI.js";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {Media, Media_namePattern, MediaType, GetNiceNameForMediaType} from "dm_common";
import {SourceChainsEditorUI} from "../../@Shared/Maps/MapNode/SourceChainsEditorUI.js";
import {YoutubePlayerUI, InfoButton, HSLA, ParseYoutubeVideoID, ES} from "web-vcore";
import {DetailsUI_Base} from "UI/@Shared/DetailsUI_Base.js";

export class MediaDetailsUI extends DetailsUI_Base<Media, MediaDetailsUI> {
	scrollView: ScrollView;
	render() {
		const {baseData, style, onChange} = this.props;
		const {newData, dataError} = this.state;
		const {Change, creating, editing} = this.helpers;
		const videoID = ParseYoutubeVideoID(newData.url);

		const splitAt = 100;
		//const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<IDAndCreationInfoUI id={baseData.id} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Media_namePattern} required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(MediaType, name=>GetNiceNameForMediaType(MediaType[name]))} enabled={creating || editing} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt}>
					<Pre>URL: </Pre>
					<TextInput
						/*pattern={Media_urlPattern}*/ required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.url} onChange={val=>Change(newData.url = val)}/>
					{newData.type == MediaType.video && newData.url && videoID == null &&
						<Span ml={5} style={{color: HSLA(30, 1, .6, 1), whiteSpace: "pre"}}>Only YouTube urls supported currently.</Span>}
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Description: </Pre>
					<TextInput enabled={creating || editing} style={ES({flex: 1})}
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
									onPlayerInitialized={player=> {
										player.GetPlayerUI().style.position = "absolute";
									}}/>}
							</div>}
				</Column>
				{dataError && dataError != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{dataError}</Row>}
			</Column>
		);
	}
}