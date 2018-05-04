import { Button, Column, Div, Pre, Row, Span } from "react-vcomponents";
import { BaseComponent } from "react-vextensions";
import { ShowMessageBox } from "react-vmessagebox";
import { ScrollView } from "react-vscrollview";
import { RemoveHelpers } from "../../Frame/Database/DatabaseHelpers";
import { Connect } from "../../Frame/Database/FirebaseConnect";
import DeleteImage from "../../Server/Commands/DeleteImage";
import UpdateImageData, { UpdateImageData_allowedPropUpdates } from "../../Server/Commands/UpdateImageData";
import { GetImages } from "../../Store/firebase/images";
import { GetNiceNameForImageType, Image } from "../../Store/firebase/images/@Image";
import { IsUserCreatorOrMod } from "../../Store/firebase/userExtras";
import { PermissionGroupSet } from "../../Store/firebase/userExtras/@UserExtraInfo";
import { GetUserID, GetUserPermissionGroups } from "../../Store/firebase/users";
import { ACTImageSelect, GetSelectedImage } from "../../Store/main/database";
import { ShowSignInPopup } from "../@Shared/NavBar/UserPanel";
import { ShowAddImageDialog } from "./Images/AddImageDialog";
import ImageDetailsUI from "./Images/ImageDetailsUI";

@Connect(state=> ({
	images: GetImages(),
	selectedImage: GetSelectedImage(),
	permissions: GetUserPermissionGroups(GetUserID()),
}))
export default class ImagesUI extends BaseComponent
		<{} & Partial<{images: Image[], selectedImage: Image, permissions: PermissionGroupSet}>,
		{selectedImage_newData: Image, selectedImage_newDataError: string}> {
	ComponentWillReceiveProps(props) {
		if (props.selectedImage != this.props.selectedImage) {
			this.SetState({selectedImage_newData: null, selectedImage_newDataError: null});
		}
	}

	scrollView: ScrollView;
	render() {
		let {images, selectedImage, permissions} = this.props;
		if (images == null) return <div>Loading images...</div>;
		let userID = GetUserID();
		let {selectedImage_newData, selectedImage_newDataError} = this.state;

		let creatorOrMod = selectedImage != null && IsUserCreatorOrMod(userID, selectedImage);
		
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					//position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 0, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10
				}}>
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
					<ScrollView ref={c=>this.scrollView = c} style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=> {
						if (e.target != e.currentTarget) return;
						store.dispatch(new ACTImageSelect({id: null}));
					}}>
						{images.map((image, index)=> {
							return <ImageUI key={index} first={index == 0} image={image} selected={selectedImage == image}/>;
						})}
					</ScrollView>
				</Column>
				<ScrollView ref={c=>this.scrollView = c} style={{
					marginLeft: 10,
					//flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedImage &&
								<Div style={{fontSize: 17, fontWeight: 500}}>
									{selectedImage.name}
								</Div>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedImage_newData != null && selectedImage_newDataError == null} onClick={async e=> {
										let updates = RemoveHelpers(selectedImage_newData.Including(...UpdateImageData_allowedPropUpdates));
										await new UpdateImageData({id: selectedImage._id, updates}).Run();
										//this.SetState({selectedImage_newData: null});
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
									onChange={(data, error)=>this.SetState({selectedImage_newData: data, selectedImage_newDataError: error})}/>
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