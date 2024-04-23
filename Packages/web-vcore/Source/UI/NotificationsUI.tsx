import React from "react";
import chroma from "chroma-js";
import moment from "moment";
import {Button, Column, Div, Row} from "react-vcomponents";
import {BaseComponent, cssHelper, Style} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {Observer, RunInAction} from "../Utils/Store/MobX.js";
import {manager} from "../Manager.js";
import {wvc_store} from "../Store/WVCStore.js";
import {Chroma, GetTimeSinceLoad} from "../Utils/General/General.js";
import {NotificationMessage} from "./NotificationsUI/NotificationMessage.js";
import {chroma_maxDarken} from "../Utils/UI/Styles.js";

/*AddGlobalStyle(`
.NotificationScrollView { pointer-events: none; }
.NotificationScrollView > * { pointer-events: auto; }
.NotificationScrollView > .content { pointer-events: none; }
.NotificationScrollView > .content > * { pointer-events: auto; }
`);*/

@Observer
export class NotificationsUI extends BaseComponent<{placement: "topLeft" | "topRight", navBarHeight: number, style?: Style}, {}> {
	scrollView: ScrollView;
	render() {
		const {placement, navBarHeight, style} = this.props;
		const messages = wvc_store.notificationMessages;
		const {css, key} = cssHelper(this);
		return (
			<div className="NotificationsUI_outer clickThrough" style={css(
				{position: "fixed", width: "30%", bottom: 0, zIndex: 12},
				placement == "topLeft" && {left: 0, top: navBarHeight},
				placement == "topRight" && {right: 0, top: navBarHeight},
				style,
			)}>
				<ScrollView ref={c=>this.scrollView = c}
					className="NotificationScrollView" scrollVBarStyle={{width: 10}}
					style={css({height: "100%", pointerEvents: "none"})}
					contentStyle={css({willChange: "transform", pointerEvents: "none"})}
				>
					<Column className="NotificationsUI" ct style={css(
						{maxWidth: "calc(100% - 10px)", alignItems: placement == "topLeft" ? "flex-start" : "flex-end", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"},
					)}>
						{!wvc_store.webSocketConnected && wvc_store.webSocketLastDCTime != null && GetTimeSinceLoad() > 10000 &&
						<MessageUI pinned={true}>
							<Row>Websocket connection to server lost.</Row>
							<Row>Attempting reconnection... (last attempt: {moment(wvc_store.webSocketLastDCTime).format("HH:mm:ss")})</Row>
						</MessageUI>}
						{/*IsDBReadOnly.CatchBail(false) &&
						<MessageUI pinned={true}>
							<Row>Database is currently read-only. Reason: {GetDBReadOnlyMessage()}</Row>
						</MessageUI>*/}
						{messages.OrderBy(a=>(a.pinnedTill != null ? 0 : 1)).map((message, index)=>{
							return <MessageUI key={index} message={message} pinned={message.pinnedTill != null && Date.now() < message.pinnedTill}/>;
						})}
					</Column>
				</ScrollView>
			</div>
		);
	}
	/*PostRender() {
		this.scrollView.UpdateSize();
	}*/
}

export class MessageUI extends BaseComponent<{message?: NotificationMessage, pinned?: boolean, children?: any}, {}> {
	render() {
		const {message, pinned, children} = this.props;
		const backgroundColor_base = manager.GetSkin().NavBarPanelBackgroundColor().alpha(1);
		const backgroundColor_blueified_normal = chroma.mix(backgroundColor_base, Chroma("rgba(0,175,255,.7)"), .05);
		const backgroundColor_blueified_dark = backgroundColor_blueified_normal.darken(.1 * chroma_maxDarken);

		const {key, css} = cssHelper(this);
		return (
			<Div ml={10} mt={10} className={key("MessageUI")} style={{position: "relative", borderRadius: 5, cursor: "default", boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
				<div style={{display: "flex", background: backgroundColor_blueified_normal.css(), borderRadius: 5 /* cursor: "pointer" */}}>
					<Div sel style={css(
						{
							position: "relative", padding: 5, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
							borderRadius: "5px 0 0 5px",
							color: manager.GetSkin().TextColor().css(),
						},
						pinned && {borderRadius: 5},
					)}>
						{message?.text}
						{children}
					</Div>
					{!pinned &&
					<Button text="X"
						style={css({
							display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
							width: 18, padding: "2px 4px", fontSize: 13, lineHeight: "1px", // keeps text from making meta-theses too tall
							backgroundColor: backgroundColor_blueified_dark.css(),
							// boxShadow: "none",
							border: "none",
							color: manager.GetSkin().TextColor().css(),
							":hover": {backgroundColor: backgroundColor_blueified_dark.brighten(.05).css()},
						})}
						onClick={e=>{
							RunInAction("MessageUI.RemoveMessage.onClick", ()=>wvc_store.notificationMessages.Remove(message));
						}}/>}
				</div>
			</Div>
		);
	}
}