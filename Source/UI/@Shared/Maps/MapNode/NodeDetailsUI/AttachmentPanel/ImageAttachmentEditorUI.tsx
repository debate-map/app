import {GetErrorMessagesUnderElement, Clone, E} from "js-vextensions";
import {Column, Pre, RowLR, Spinner, TextInput, Row, DropDown, DropDownTrigger, Button, DropDownContent, Text} from "react-vcomponents";
import {BaseComponent, GetDOM, BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {TermDefinitionPanel} from "../../NodeUI/Panels/DefinitionsPanel";
import {ShowAddImageDialog} from "Source/UI/Database/Images/AddImageDialog";
import {ImageAttachment} from "@debate-map/server-link/Source/Link";
import {Validate} from "mobx-firelink";
import {GetImage, GetImagesByURL} from "@debate-map/server-link/Source/Link";
import {Link, Observer} from "vwebapp-framework";
import {HasModPermissions} from "@debate-map/server-link/Source/Link";
import {MeID, GetUser} from "@debate-map/server-link/Source/Link";
import {Image} from "@debate-map/server-link/Source/Link";

type Props = {baseData: ImageAttachment, creating: boolean, editing?: boolean, style?, onChange?: (newData: ImageAttachment)=>void};
export class ImageAttachmentEditorUI extends BaseComponent<Props, {newData: ImageAttachment}> {
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
		const image = Validate("UUID", newData.id) == null ? GetImage(newData.id) : null;

		const enabled = creating || editing;
		return (
			<Column style={style}>
				<Row>
					<TextInput placeholder="Image ID or URL..." enabled={enabled} delayChangeTillDefocus={true} style={{width: "100%", borderRadius: "5px 5px 0 0"}}
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
									s.main.database.subpage = "images";
									s.main.database.selectedImageID = image._key;
								}}>
									<Button text="Show details"/>
								</Link>
							</Row>}
							{!image &&
							<Column>
								<ImageSearchOrCreateUI url={newData.id} enabled={enabled} onSelect={id=>Change(newData.id = id)}/>
							</Column>}
						</Column></DropDownContent>
					</DropDown>
				</Row>
			</Column>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return Clone(newData) as ImageAttachment;
	}
}

@Observer
class ImageSearchOrCreateUI extends BaseComponentPlus({} as {url: string, enabled: boolean, onSelect: (id: string)=>void}, {}) {
	render() {
		const {url, enabled, onSelect} = this.props;
		const imagesWithMatchingURL = GetImagesByURL(url);
		return (
			<>
				{imagesWithMatchingURL.length == 0 && <Row style={{padding: 5}}>No images found with the url "{url}".</Row>}
				{imagesWithMatchingURL.map((image, index)=>{
					return <FoundImageUI key={image._key} image={image} index={index} enabled={enabled} onSelect={()=>onSelect(image._key)}/>;
				})}
				<Row mt={5} style={{
					//borderTop: `1px solid ${HSLA(0, 0, 1, .5)}`,
					background: imagesWithMatchingURL.length % 2 == 0 ? "rgba(30,30,30,.7)" : "rgba(0,0,0,.7)",
					padding: 5,
					borderRadius: "0 0 5px 5px",
				}}>
					<Button text="Create new image" enabled={enabled && HasModPermissions(MeID())}
						title={HasModPermissions(MeID()) ? null : "Only moderators can add images currently. (till review/approval system is implemented)"}
						onClick={e=>{
							ShowAddImageDialog({url}, onSelect);
						}}/>
				</Row>
			</>
		);
	}
}
export class FoundImageUI extends BaseComponentPlus({} as {image: Image, index: number, enabled: boolean, onSelect: ()=>void}, {}) {
	render() {
		const {image, index, enabled, onSelect} = this.props;
		const creator = GetUser(image.creator);
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
				<Link text={`${image._key}\n(by ${creator?.displayName ?? "n/a"})`} style={{fontSize: 13, whiteSpace: "pre"}}
					onContextMenu={e=>e.nativeEvent["handled"] = true}
					actionFunc={s=>{
						s.main.page = "database";
						s.main.database.subpage = "images";
						s.main.database.selectedImageID = image._key;
					}}/>
				<Text ml={5} sel style={{fontSize: 13}}>{image.name}</Text>
				<Button ml="auto" text="Select" enabled={enabled} style={{flexShrink: 0}} onClick={onSelect}/>
			</Row>
		);
	}
}