import {ACTImageSelect, GetSelectedImage} from "../../Store/main/content";
import DeleteImage from "../../Server/Commands/DeleteImage";
import UpdateImageData, { UpdateImageData_allowedPropUpdates } from "../../Server/Commands/UpdateImageData";
import {Assert} from "../../Frame/General/Assert";
import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate, FindDOM, Div, Span, Pre} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";
import Column from "../../Frame/ReactComponents/Column";
import Row from "../../Frame/ReactComponents/Row";
import Button from "../../Frame/ReactComponents/Button";
import {Connect} from "../../Frame/Database/FirebaseConnect";
import {PermissionGroupSet} from "../../Store/firebase/userExtras/@UserExtraInfo";
import {GetUserPermissionGroups, GetUserID} from "../../Store/firebase/users";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";
import {RemoveHelpers} from "../../Frame/Database/DatabaseHelpers";
import UpdateNodeDetails from "../../Server/Commands/UpdateNodeDetails";
import {IsUserCreatorOrMod} from "../../Store/firebase/userExtras";
import {ShowMessageBox} from "../../Frame/UI/VMessageBox";
import * as Moment from "moment";
import {GetImages} from "../../Store/firebase/images";
import {Image, ImageType} from "../../Store/firebase/images/@Image";
import ImageDetailsUI from "./Images/ImageDetailsUI";
import {ShowAddImageDialog} from "./Images/AddImageDialog";

@Connect(state=> ({
	images: GetImages(),
	selectedImage: GetSelectedImage(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class ImagesUI extends BaseComponent
		<{} & Partial<{images: Image[], selectedImage: Image, permissions: PermissionGroupSet}>,
		{selectedImage_newData: Image}> {
	ComponentWillReceiveProps(props) {
		if (props.selectedImage != this.props.selectedImage) {
			this.SetState({selectedImage_newData: null});
		}
	}

	scrollView: ScrollView;
	render() {
		let {images, selectedImage, permissions} = this.props;
		if (images == null) return <div>Loading images...</div>;
		let userID = GetUserID();
		let {selectedImage_newData} = this.state;

		let creatorOrMod = selectedImage != null && IsUserCreatorOrMod(userID, selectedImage);
		
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{position: "relative", flex: .4, height: "calc(100% - 20px)", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
					<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add image" onClick={e=> {
								if (userID == null) return ShowSignInPopup();
								ShowAddImageDialog(userID);
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Images
						</Div>
					</Row>
					<ScrollView ref={c=>this.scrollView = c} contentStyle={{flex: 1, padding: 10}} onClick={e=> {
						if (e.target != e.currentTarget) return;
						store.dispatch(new ACTImageSelect({id: null}));
					}}>
						{images.map((image, index)=> {
							return <ImageUI key={index} first={index == 0} image={image} selected={selectedImage == image}/>;
						})}
					</ScrollView>
				</Column>
				<ScrollView ref={c=>this.scrollView = c} style={{marginLeft: 10, flex: .6}} contentStyle={{flex: 1, padding: 10}}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedImage &&
								<Div style={{fontSize: 17, fontWeight: 500}}>
									{selectedImage.name}
								</Div>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedImage_newData != null} onClick={async e=> {
										let updates = RemoveHelpers(selectedImage_newData.Including(...UpdateImageData_allowedPropUpdates));
										await new UpdateImageData({id: selectedImage._id, updates}).Run();
										this.SetState({selectedImage_newData: null});
									}}/>}
								{creatorOrMod &&
									<Button text="Delete image" ml={10} enabled={selectedImage != null} onClick={async e=> {
										ShowMessageBox({
											title: `Delete "${selectedImage.name}"`, cancelButton: true,
											message: `Delete the image "${selectedImage.name}"?`,
											onOK: async ()=> {
												await new DeleteImage({id: selectedImage._id}).Run();
											}
										});
									}}/>}
							</Div>
						</Row>
						{selectedImage
							? <ImageDetailsUI baseData={selectedImage} creating={false} editing={creatorOrMod} style={{padding: 10}}
									onChange={data=>this.SetState({selectedImage_newData: data})}/>
							: <div style={{padding: 10}}>No image selected.</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

type ImageUI_Props = {image: Image, first: boolean, selected: boolean};
export class ImageUI extends BaseComponent<ImageUI_Props, {}> {
	render() {
		let {image, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
					style={E(
						{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
						selected && {background: "rgba(100,100,100,.7)"},
					)}
					onClick={e=> {
						store.dispatch(new ACTImageSelect({id: image._id}));
					}}>
				<Pre>{image.name}: </Pre>
				{image.description.KeepAtMost(100)}
				<Span ml="auto">
					<Pre style={{opacity: .7}}>({GetNiceNameForImageType(image.type)}) </Pre>
					<Pre>#{image._id}</Pre>
				</Span>
			</Row>
		);
	}
}

export function GetNiceNameForImageType(type: ImageType) {
	return ImageType[type].toLowerCase();
}