import {GetErrorMessagesUnderElement, Clone, E} from "js-vextensions";
import {Column, Pre, RowLR, Spinner, TextInput, Row, DropDown, DropDownTrigger, Button, DropDownContent, Text, CheckBox} from "react-vcomponents";
import {BaseComponent, GetDOM, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {TermDefinitionPanel} from "../../NodeUI/Panels/DefinitionsPanel";
import {ShowAddMediaDialog} from "UI/Database/Medias/AddMediaDialog";
import {MediaAttachment} from "@debate-map/server-link/Source/Link";
import {Validate} from "mobx-firelink";
import {GetMedia, GetMediasByURL} from "@debate-map/server-link/Source/Link";
import {Link, Observer, InfoButton} from "vwebapp-framework";
import {HasModPermissions} from "@debate-map/server-link/Source/Link";
import {MeID, GetUser} from "@debate-map/server-link/Source/Link";
import {Media} from "@debate-map/server-link/Source/Link";
import {SourceChainsEditorUI} from "../../SourceChainsEditorUI";

type Props = {baseData: MediaAttachment, creating: boolean, editing?: boolean, style?, onChange?: (newData: MediaAttachment)=>void};
export class MediaAttachmentEditorUI extends BaseComponent<Props, {newData: MediaAttachment}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
		{ this.SetState({newData: Clone(props.baseData)}); }
	}

	scrollView: ScrollView;
	render() {
		const {creating, editing, style, onChange} = this.props;
		const {newData} = this.state;
		const Change = (..._)=>{
			if (onChange) { onChange(this.GetNewData()); }
			this.Update();
		};
		const image = Validate("UUID", newData.id) == null ? GetMedia(newData.id) : null;

		const enabled = creating || editing;
		return (
			<Column style={style}>
				<Row>
					<TextInput placeholder="Media ID or URL..." enabled={enabled} delayChangeTillDefocus={true} style={{width: "100%", borderRadius: "5px 5px 0 0"}}
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
						<DropDownContent style={{left: 0, width: 600, zIndex: 1, borderRadius: "0 5px 5px 5px", padding: image ? 10 : 0}}><Column>
							{image &&
							<Row>
								<Link style={{marginTop: 5, alignSelf: "flex-start"}} onContextMenu={e=>e.nativeEvent["handled"] = true} actionFunc={s=>{
									s.main.page = "database";
									s.main.database.subpage = "media";
									s.main.database.selectedMediaID = image._key;
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
				<Row center mt={5} style={{width: "100%"}}>
					<CheckBox text="Captured" enabled={creating || editing} value={newData.captured} onChange={val=>Change(newData.captured = val)}/>
					<InfoButton ml={5} text="Whether the image/video is claimed to be a capturing of real-world footage."/>
				</Row>
				<Row mt={5} style={{display: "flex", alignItems: "center"}}>
					<Pre>Preview width:</Pre>
					<Spinner ml={5} max={100} enabled={creating || editing}
						value={newData.previewWidth | 0} onChange={val=>Change(newData.previewWidth = val != 0 ? val : null)}/>
					<Pre>% (0 for auto)</Pre>
				</Row>
				<Row mt={10}>
					<SourceChainsEditorUI ref={c=>this.chainsEditor = c} enabled={creating || editing} baseData={newData.sourceChains} onChange={val=>Change(newData.sourceChains = val)}/>
				</Row>
			</Column>
		);
	}
	chainsEditor: SourceChainsEditorUI;
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0] || this.chainsEditor.GetValidationError();
	}

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as MediaAttachment;
	}
}

@Observer
class MediaSearchOrCreateUI extends BaseComponentPlus({} as {url: string, enabled: boolean, onSelect: (id: string)=>void}, {}) {
	render() {
		const {url, enabled, onSelect} = this.props;
		const mediasWithMatchingURL = GetMediasByURL(url);
		return (
			<>
				{mediasWithMatchingURL.length == 0 && <Row style={{padding: 5}}>No media found with the url "{url}".</Row>}
				{mediasWithMatchingURL.map((media, index)=>{
					return <FoundMediaUI key={media._key} media={media} index={index} enabled={enabled} onSelect={()=>onSelect(media._key)}/>;
				})}
				<Row mt={5} style={{
					//borderTop: `1px solid ${HSLA(0, 0, 1, .5)}`,
					background: mediasWithMatchingURL.length % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
					padding: 5,
					borderRadius: "0 0 5px 5px",
				}}>
					<Button text="Create new image" enabled={enabled && HasModPermissions(MeID())}
						title={HasModPermissions(MeID()) ? null : "Only moderators can add media currently. (till review/approval system is implemented)"}
						onClick={e=>{
							ShowAddMediaDialog({url}, onSelect);
						}}/>
				</Row>
			</>
		);
	}
}
export class FoundMediaUI extends BaseComponentPlus({} as {media: Media, index: number, enabled: boolean, onSelect: ()=>void}, {}) {
	render() {
		const {media, index, enabled, onSelect} = this.props;
		const creator = GetUser(media.creator);
		return (
			<Row center
				style={E(
					{
						whiteSpace: "normal", //cursor: "pointer",
						background: index % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
						padding: 5,
					},
					index == 0 && {borderRadius: "5px 5px 0 0"},
				)}
			>
				<Link text={`${media._key}\n(by ${creator?.displayName ?? "n/a"})`} style={{fontSize: 13, whiteSpace: "pre"}}
					onContextMenu={e=>e.nativeEvent["handled"] = true}
					actionFunc={s=>{
						s.main.page = "database";
						s.main.database.subpage = "media";
						s.main.database.selectedMediaID = media._key;
					}}/>
				<Text ml={5} sel style={{fontSize: 13}}>{media.name}</Text>
				<Button ml="auto" text="Select" enabled={enabled} style={{flexShrink: 0}} onClick={onSelect}/>
			</Row>
		);
	}
}