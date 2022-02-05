import {Button, Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {AddGlobalStyle, BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {ES, GetTimeSinceLoad, loadTime, Observer, RunInAction} from "web-vcore";
import {runInAction} from "web-vcore/nm/mobx.js";
import {NotificationMessage} from "Store/main/@NotificationMessage.js";
import moment from "web-vcore/nm/moment";
import React from "react";
import {GetDBReadOnlyMessage, IsDBReadOnly} from "dm_common";
import chroma from "web-vcore/nm/chroma-js.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {chroma_maxDarken} from "Utils/UI/General";

/*AddGlobalStyle(`
.NotificationScrollView { pointer-events: none; }
.NotificationScrollView > * { pointer-events: auto; }
.NotificationScrollView > .content { pointer-events: none; }
.NotificationScrollView > .content > * { pointer-events: auto; }
`);*/

@Observer
export class NotificationsUI extends BaseComponent<{}, {}> {
	//static main: NotificationsUI;

	scrollView: ScrollView;
	render() {
		const messages = store.main.notificationMessages;
		return (
			<ScrollView ref={c=>this.scrollView = c}
				className="NotificationScrollView" scrollVBarStyle={{width: 10}}
				style={{height: "100%", pointerEvents: "none"}}
				contentStyle={{willChange: "transform", pointerEvents: "none"}}
			>
				<Column className="NotificationsUI" ct style={{maxWidth: "calc(100% - 10px)", alignItems: "flex-start", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}>
					{!store.main.webSocketConnected && store.main.webSocketLastDCTime != null && GetTimeSinceLoad() > 10000 &&
					<MessageUI pinned={true}>
						<Row>Websocket connection to server lost.</Row>
						<Row>Attempting reconnection... (last attempt: {moment(store.main.webSocketLastDCTime).format("HH:mm:ss")})</Row>
					</MessageUI>}
					{IsDBReadOnly.CatchBail(false) &&
					<MessageUI pinned={true}>
						<Row>Database is currently read-only. Reason: {GetDBReadOnlyMessage()}</Row>
					</MessageUI>}
					{messages.OrderBy(a=>(a.pinnedTill != null ? 0 : 1)).map((message, index)=>{
						return <MessageUI key={index} message={message} pinned={message.pinnedTill != null && Date.now() < message.pinnedTill}/>;
					})}
				</Column>
			</ScrollView>
		);
	}
	PostRender() {
		this.scrollView.UpdateSize();
	}
}

/* export class MessageUI extends BaseComponent<{message: NotificationMessage}, {}> {
	render() {
		let {message} = this.props;
		return (
			<Row style={{background: "rgba(255,255,255,.3)", borderRadius: 5}}>
				<Span ml={7} mt={5} mb={5} sel>{message.text}</Span>
				<Button text="X" ml={5} style={{padding: "2px 4px"}} onClick={()=> {
					store.dispatch(new ACTNotificationMessageRemove(message.id));
				}}/>
			</Row>
		);
	}
} */
export class MessageUI extends BaseComponent<{message?: NotificationMessage, pinned?: boolean, children?: any}, {}> {
	render() {
		const {message, pinned, children} = this.props;
		const backgroundColor_base = liveSkin.OverlayPanelBackgroundColor().alpha(1);
		const backgroundColor_blueified_normal = chroma.mix(backgroundColor_base, chroma("rgba(0,175,255,.7)"), .05);
		const backgroundColor_blueified_dark = backgroundColor_blueified_normal.darken(.1 * chroma_maxDarken);
		return (
			<Div ml={10} mt={10} className="MessageUI" style={{position: "relative", borderRadius: 5, cursor: "default", boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
				<div style={{display: "flex", background: backgroundColor_blueified_normal.css(), borderRadius: 5 /* cursor: "pointer" */}}>
					<Div sel style={ES(
						{
							position: "relative", padding: 5, fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
							borderRadius: "5px 0 0 5px",
						},
						pinned && {borderRadius: 5},
					)}>
						{message?.text}
						{children}
					</Div>
					{!pinned &&
					<Button text="X"
						style={{
							display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
							width: 18, padding: "2px 4px", fontSize: 13, lineHeight: "1px", // keeps text from making meta-theses too tall
							backgroundColor: backgroundColor_blueified_dark.css(),
							// boxShadow: "none",
							border: "none",
							":hover": {backgroundColor: backgroundColor_blueified_dark.brighten(.05).css()},
						}}
						onClick={e=>{
							RunInAction("MessageUI.RemoveMessage.onClick", ()=>store.main.notificationMessages.Remove(message));
						}}/>}
				</div>
			</Div>
		);
	}
}