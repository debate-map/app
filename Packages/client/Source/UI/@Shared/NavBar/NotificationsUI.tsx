import {Button, Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {AddGlobalStyle, BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {store} from "Store";
import {GetTimeSinceLoad, loadTime, Observer, RunInAction} from "web-vcore";
import {runInAction} from "web-vcore/nm/mobx.js";
import {NotificationMessage} from "Store/main/@NotificationMessage.js";
import moment from "web-vcore/nm/moment";
import React from "react";

AddGlobalStyle(`
.NotificationScrollView > * { pointer-events: auto; }
.NotificationScrollView { pointer-events: none; }
.NotificationScrollView > .content > * { pointer-events: auto; }
.NotificationScrollView > .content { pointer-events: none; }
`);

@Observer
export class NotificationsUI extends BaseComponent<{}, {}> {
	//static main: NotificationsUI;

	scrollView: ScrollView;
	render() {
		const messages = store.main.notificationMessages;
		const backgroundColor = "40,60,80";
		return (
			<ScrollView ref={c=>this.scrollView = c} className="NotificationScrollView" scrollVBarStyle={{width: 10}} style={{height: "100%"}} contentStyle={{willChange: "transform"}}>
				<Column ct style={{maxWidth: "calc(100% - 10px)", alignItems: "flex-start", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}>
					{!store.main.webSocketConnected && store.main.webSocketLastDCTime != null && GetTimeSinceLoad() > 10000 &&
					<Div ml={10} mt={10} mb={10} style={{position: "relative", borderRadius: 5, cursor: "default", boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
						<div style={{display: "flex", background: "rgba(0,0,0,.7)", borderRadius: 5 /* cursor: "pointer" */}}>
							<Div sel style={{position: "relative", padding: 5, fontSize: 14, background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"}}>
								<Row>Websocket connection to server lost.</Row>
								<Row>Attempting reconnection... (last attempt: {moment(store.main.webSocketLastDCTime).format("HH:mm:ss")})</Row>
							</Div>
						</div>
					</Div>}
					{messages.map((message, index)=>{
						return <MessageUI key={index} message={message}/>;
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
export class MessageUI extends BaseComponent<{message: NotificationMessage}, {}> {
	render() {
		const {message} = this.props;
		const backgroundColor = "40,60,80";
		return (
			<Div ml={10} mt={10} style={{position: "relative", borderRadius: 5, cursor: "default", boxShadow: "rgba(0,0,0,1) 0px 0px 2px"}}>
				<div style={{display: "flex", background: "rgba(0,0,0,.7)", borderRadius: 5 /* cursor: "pointer" */}}>
					<div style={{position: "relative", padding: 5}}>
						<div style={{
							position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
							background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px",
						}}/>
						<Div sel style={{position: "relative", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
							{message.text}
						</Div>
					</div>
					<Button text="X"
						style={{
							display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
							width: 18, padding: "2px 4px", fontSize: 13, lineHeight: "1px", // keeps text from making meta-theses too tall
							backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * 0.8).RoundTo(1)).join(",")},.7)`,
							// boxShadow: "none",
							border: "none",
							":hover": {backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * 0.9).RoundTo(1)).join(",")},.7)`},
						}}
						onClick={e=>{
							RunInAction("MessageUI.RemoveMessage.onClick", ()=>store.main.notificationMessages.Remove(message));
						}}/>
				</div>
			</Div>
		);
	}
}