import {Button, Column, Div, Pre, Row, Span, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus, UseEffect} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {GetSelectedMedia, GetSelectedMediaID} from "Store/main/database";
import {Observer, GetUpdates, ES, RunInAction} from "web-vcore";
import {runInAction} from "web-vcore/nm/mobx.js";
import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import {Media, GetNiceNameForMediaType, GetUserPermissionGroups, IsUserCreatorOrMod, HasModPermissions, MeID, GetMedias, UpdateMedia, DeleteMedia} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {MediaDetailsUI, ShowAddMediaDialog} from "./Medias/MediaDetailsUI.js";
import {ShowSignInPopup} from "../@Shared/NavBar/UserPanel.js";

@Observer
export class MediasUI extends BaseComponentPlus({} as {}, {} as {selectedMedia_newData: Media|n, selectedMedia_newDataError: string|n}) {
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

		if (medias == null) return <div>Loading media...</div>;
		return (
			<Row plr={7} style={{height: "100%", alignItems: "flex-start"}}>
				<Column mtb={10} style={{
					// position: "relative", flex: .4, height: "calc(100% - 20px)",
					position: "absolute", left: 10, right: "40%", height: "calc(100% - 20px)", // fix for safari
					background: liveSkin.BasePanelBackgroundColor().alpha(.5).css(), borderRadius: 10,
				}}>
					<Row center style={{height: 40, justifyContent: "center", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: "10px 10px 0 0"}}>
						<Div p={7} style={{position: "absolute", left: 0}}>
							<Button text="Add media" enabled={HasModPermissions(MeID())} title={HasModPermissions(MeID()) ? null : "Only moderators can add media currently. (till review/approval system is implemented)"}onClick={e=>{
								if (userID == null) return ShowSignInPopup();
								ShowAddMediaDialog({});
							}}/>
						</Div>
						<Div style={{fontSize: 17, fontWeight: 500}}>
							Media
						</Div>
					</Row>
					<ScrollView ref={c=>this.scrollView = c} style={ES({flex: 1})} contentStyle={ES({flex: 1, padding: 10})} onClick={e=>{
						if (e.target != e.currentTarget) return;
						RunInAction("MediasUI.ScrollView.onClick", ()=>store.main.database.selectedMediaID = null);
					}}>
						{medias.map((media, index)=><MediaUI key={index} first={index == 0} image={media} selected={GetSelectedMediaID() == media.id}/>)}
					</ScrollView>
				</Column>
				<ScrollView ref={c=>this.scrollView = c} style={{
					// marginLeft: 10,
					// flex: .6,
					position: "absolute", left: "60%", right: 0, height: "100%", // fix for safari
				}} contentStyle={ES({flex: 1, padding: 10})}>
					<Column style={{position: "relative", background: liveSkin.BasePanelBackgroundColor().alpha(.5).css(), borderRadius: 10}}>
						<Row style={{height: 40, justifyContent: "center", background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: "10px 10px 0 0"}}>
							{selectedMedia
								&& <Text style={{fontSize: 17, fontWeight: 500}}>
									{selectedMedia.name}
								</Text>}
							<Div p={7} style={{position: "absolute", right: 0}}>
								{creatorOrMod &&
									<Button ml="auto" text="Save details" enabled={selectedMedia_newData != null && selectedMedia_newDataError == null}
										onClick={async e=>{
											Assert(selectedMedia); // nn: button would be disabled otherwise
											const updates = GetUpdates(selectedMedia, selectedMedia_newData);
											await new UpdateMedia({id: selectedMedia.id, updates}).RunOnServer();
											// this.SetState({selectedImage_newData: null});
										}}/>}
								{creatorOrMod &&
									<Button text="Delete media" ml={10} enabled={selectedMedia != null} onClick={async e=>{
										Assert(selectedMedia); // nn: button would be disabled otherwise
										ShowMessageBox({
											title: `Delete "${selectedMedia.name}"`, cancelButton: true,
											message: `Delete the media "${selectedMedia.name}"?`,
											onOK: async()=>{
												await new DeleteMedia({id: selectedMedia.id}).RunOnServer();
											},
										});
									}}/>}
							</Div>
						</Row>
						{selectedMedia
							? <MediaDetailsUI baseData={selectedMedia} phase={creatorOrMod ? "edit" : "view"} style={{padding: 10}}
								onChange={(data, error)=>this.SetState({selectedMedia_newData: data, selectedMedia_newDataError: error})}/>
							: <div style={{padding: 10}}>No media selected.</div>}
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
					{padding: 5, background: liveSkin.BasePanelBackgroundColor().alpha(.5).css(), borderRadius: 5, cursor: "pointer"},
					selected && {background: liveSkin.BasePanelBackgroundColor().alpha(1).css()},
				)}
				onClick={e=>{
					RunInAction("MediaUI.onClick", ()=>store.main.database.selectedMediaID = image.id);
				}}>
				<Pre>{image.name}: </Pre>
				{image.description.KeepAtMost(100)}
				<Span ml="auto">
					<Pre style={{opacity: 0.7}}>({GetNiceNameForMediaType(image.type)}) </Pre>
					<Pre>#{image.id}</Pre>
				</Span>
			</Row>
		);
	}
}