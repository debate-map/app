import {Button, Column, Div, Pre, Row, Span, Text} from "react-vcomponents";
import {BaseComponent, BaseComponentPlus, UseEffect} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {ScrollView} from "react-vscrollview";
import {ES} from "Source/Utils/UI/GlobalStyles";
import {store} from "Source/Store";
import {GetSelectedMedia} from "Source/Store/main/database";
import {Observer, GetUpdates} from "vwebapp-framework";
import {runInAction} from "mobx";
import {E} from "js-vextensions";
import {Media, GetNiceNameForMediaType, GetUserPermissionGroups, IsUserCreatorOrMod, HasModPermissions, MeID, GetMedias, UpdateMediaData, DeleteMedia} from "@debate-map/server-link/Source/Link";
import {MediaDetailsUI} from "./Medias/MediaDetailsUI";
import {ShowAddMediaDialog} from "./Medias/AddMediaDialog";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel";

@Observer
export class MediasUI extends BaseComponentPlus({} as {}, {} as { selectedMedia_newData: Media, selectedMedia_newDataError: string }) {
	scrollView: ScrollView;
	render() {
		const {selectedMedia_newData, selectedMedia_newDataError} = this.state;

		const userID = MeID();
		const medias = GetMedias();
		const selectedMedia = GetSelectedMedia();
		const permissions = GetUserPermissionGroups(userID);
		const creatorOrMod = selectedMedia != null && IsUserCreatorOrMod(userID, selectedMedia);

		// whenever selectedMedia changes, reset the derivative states (there's probably a better way to do this, but I don't know how yet)
		UseEffect(()=>{
			this.SetState({selectedMedia_newData: null, selectedMedia_newDataError: null});
		}, [selectedMedia]);

		if (medias == null) return <div>Loading medias...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: "rgba(0,0,0,.5)", borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add media" enabled={HasModPermissions(MeID())} title={HasModPermissions(MeID()) ? null : "Only moderators can add images currently. (till review/approval system is implemented)"}onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddMediaDialog({});
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Medias
						</Div>
					</Row>
					<ScrollView ref={c=>this.scrollView = c} style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						runInAction("MediasUI.ScrollView.onClick", ()=>store.main.database.selectedMediaID = null);
					}}>
						{medias.map((media, index)=><MediaUI key={index} first={index == 0} image={media} selected={selectedMedia == media}/>)}
					</ScrollView>
				</Column>
				<ScrollView ref={c=>this.scrollView = c} style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: "rgba(0,0,0,.5)", borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: "rgba(0,0,0,.7)", borderRadius: "10px 10px 0 0"}}>
							{selectedMedia
								&& <Text style={{fontSize: 17, fontWeight: 500}}>
									{selectedMedia.name}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedMedia_newData != null && selectedMedia_newDataError == null}
										onClick={async e=>{
											const updates = GetUpdates(selectedMedia, selectedMedia_newData);
											await new UpdateMediaData({id: selectedMedia._key, updates}).Run();
											// this.SetState({selectedImage_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete media" ml={10} enabled={selectedMedia != null} onClick={async e=>{
										ShowMessageBox({
											title: `Delete "${selectedMedia.name}"`, cancelButton: true,
											message: `Delete the media "${selectedMedia.name}"?`,
											onOK: async()=>{
												await new DeleteMedia({id: selectedMedia._key}).Run();
											},
										});
									}}/>}
							</Div>
						</Row>
						{selectedMedia
							? <MediaDetailsUI baseData={selectedMedia} creating={false} editing={creatorOrMod} style={{padding: 10}}
								onChange={(data, error)=>this.SetState({selectedMedia_newData: data, selectedMedia_newDataError: error})}/>
							: <div style={{padding: 10}}>No image selected.</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
}

type MediaUI_Props = {image: Media, first: boolean, selected: boolean};
export class MediaUI extends BaseComponent<MediaUI_Props, {}> {
	render() {
		const {image, first, selected} = this.props;
		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{padding: 5, background: "rgba(100,100,100,.5)", borderRadius: 5, cursor: "pointer"},
					selected && {background: "rgba(100,100,100,.7)"},
				)}
				onClick={e=>{
					runInAction("MediaUI.onClick", ()=>store.main.database.selectedMediaID = image._key);
				}}>
				<Pre>{image.name}: </Pre>
				{image.description.KeepAtMost(100)}
				<Span ml="auto">
					<Pre style={{opacity: 0.7}}>({GetNiceNameForMediaType(image.type)}) </Pre>
					<Pre>#{image._key}</Pre>
				</Span>
			</Row>
		);
	}
}