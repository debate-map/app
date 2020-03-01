import {Button, Column, Div, Pre, Row, Span, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, UseEffect} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {ES} from "Source/Utils/UI/GlobalStyles";
import {store} from "Source/Store";
import {GetSelectedImage} from "Source/Store/main/database";
import {Observer, GetUpdates} from "vwebapp-framework";
import {runInAction} from "mobx";
import {E} from "js-vextensions";
import {ShowAddImageDialog} from "./Images/AddImageDialog";
import {ImageDetailsUI} from "./Images/ImageDetailsUI";
import {Image, GetNiceNameForImageType} from "@debate-map/server-link/Source/Link";
import {GetUserPermissionGroups, IsUserCreatorOrMod, HasModPermissions} from "@debate-map/server-link/Source/Link";
import {MeID} from "@debate-map/server-link/Source/Link";
import {GetImages} from "@debate-map/server-link/Source/Link";
import {UpdateImageData} from "@debate-map/server-link/Source/Link";
import {DeleteImage} from "@debate-map/server-link/Source/Link";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";

@Observer
export class ImagesUI extends BaseComponentPlus({} as {}, {} as { selectedImage_newData: Image, selectedImage_newDataError: string }) {
	scrollView: ScrollView;
	render() {
		const {selectedImage_newData, selectedImage_newDataError} = this.state;

		const userID = MeID();
		const images = GetImages();
		const selectedImage = GetSelectedImage();
		const permissions = GetUserPermissionGroups(userID);
		const creatorOrMod = selectedImage != null && IsUserCreatorOrMod(userID, selectedImage);

		// whenever selectedImage changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
		UseEffect(()=>{
			this.SetState({selectedImage_newData: null, selectedImage_newDataError: null});
		}, [selectedImage]);

		if (images == null) return <div>Loading images...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add image" enabled={HasModPermissions(MeID())} title={HasModPermissions(MeID()) ? null : "Only moderators can add images currently. (till review/approval system is implemented)"}onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddImageDialog({});
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Images
						</Div>
					</Row>
					<ScrollView ref={c=>this.scrollView = c} style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						runInAction("ImagesUI.ScrollView.onClick", ()=>store.main.database.selectedImageID = null);
					}}>
						{images.map((image, index)=><ImageUI key={index} first={index == 0} image={image} selected={selectedImage == image}/>)}
					</ScrollView>
				</Column>
				<ScrollView ref={c=>this.scrollView = c} style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedImage
								&& <Text style={{fontSize: 17, fontWeight: 500}}>
									{selectedImage.name}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedImage_newData != null && selectedImage_newDataError == null}
										onClick={async e=>{
											const updates = GetUpdates(selectedImage, selectedImage_newData);
											await new UpdateImageData({id: selectedImage._key, updates}).Run();
											// this.SetState({selectedImage_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete image" ml={10} enabled={selectedImage != null} onClick={async e=>{
										ShowMessageBox({
											title: `Delete "${selectedImage.name}"`, cancelButton: true,
											message: `Delete the image "${selectedImage.name}"?`,
											onOK: async()=>{
												await new DeleteImage({id: selectedImage._key}).Run();
											},
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
		const {image, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
					selected && {background: "rgba(100,100,100,.7)"},
				)}
				onClick={e=>{
					runInAction("ImageUI.onClick", ()=>store.main.database.selectedImageID = image._key);
				}}>
				<Pre>{image.name}: </Pre>
				{image.description.KeepAtMost(100)}
				<Span ml="auto">
					<Pre style={{opacity: 0.7}}>({GetNiceNameForImageType(image.type)}) </Pre>
					<Pre>#{image._key}</Pre>
				</Span>
			</Row>
		);
	}
}