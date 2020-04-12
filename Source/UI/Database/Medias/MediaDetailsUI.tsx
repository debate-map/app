import {GetEntries, GetErrorMessagesUnderElement, Clone} from "js-vextensions";
import Moment from "moment";
import {Column, Div, Pre, Row, RowLR, Select, Spinner, TextInput, CheckBox} from "react-vcomponents";
import {BaseComponent, GetDOM, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {ES} from "Source/Utils/UI/GlobalStyles";
import {IDAndCreationInfoUI} from "Source/UI/@Shared/CommonPropUIs/IDAndCreationInfoUI";
import {BoxController, ShowMessageBox} from "react-vmessagebox";
import {Media, Media_namePattern, MediaType, GetNiceNameForMediaType} from "@debate-map/server-link/Source/Link";
import {SourceChainsEditorUI} from "../../@Shared/Maps/MapNode/SourceChainsEditorUI";
import {YoutubePlayerUI, InfoButton} from "vwebapp-framework";

export class MediaDetailsUI extends BaseComponentPlus(
	{} as {baseData: Media, creating: boolean, editing: boolean, style?, onChange?: (newData: Media, error: string)=>void},
	{} as {newData: Media, dataError: string},
) {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}
	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		const error = this.GetValidationError();
		if (onChange) onChange(newData, error);
		this.SetState({newData, dataError: error});
	}

	scrollView: ScrollView;
	render() {
		const {baseData, creating, editing, style, onChange} = this.props;
		const {newData, dataError} = this.state;

		const Change = (..._)=>this.OnChange();

		const splitAt = 170;
		const width = 600;
		return (
			<Column style={style}>
				{!creating &&
					<IDAndCreationInfoUI id={baseData._key} creatorID={newData.creator} createdAt={newData.createdAt}/>}
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Name: </Pre>
					<TextInput
						pattern={Media_namePattern} required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(MediaType, name=>GetNiceNameForMediaType(MediaType[name]))} enabled={creating || editing} style={ES({flex: 1})}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>URL: </Pre>
					<TextInput
						/*pattern={Media_urlPattern}*/ required
						enabled={creating || editing} style={{width: "100%"}}
						value={newData.url} onChange={val=>Change(newData.url = val)}/>
				</RowLR>
				<RowLR mt={5} splitAt={splitAt} style={{width: "100%"}}>
					<Pre>Description: </Pre>
					<TextInput enabled={creating || editing} style={ES({flex: 1})}
						value={newData.description} onChange={val=>Change(newData.description = val)}/>
				</RowLR>
				<Column mt={10}>
					<Row style={{fontWeight: "bold"}}>Preview:</Row>
						{newData.type == MediaType.Image &&
							<Row mt={5} style={{display: "flex", alignItems: "center"}}>
								<img src={newData.url} style={{width: "100%"}}/>
							</Row>}
						{newData.type == MediaType.Video &&
							<YoutubePlayerUI videoID={newData.url.match(/v=([a-zA-Z0-9]+)/)?.[1]} /*startTime={0}*/ heightVSWidthPercent={.5625}
								onPlayerInitialized={player=> {
									player.GetPlayerUI().style.position = "absolute";
								}}/>}
				</Column>
				{dataError && dataError != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{dataError}</Row>}
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as Media;
	}
}