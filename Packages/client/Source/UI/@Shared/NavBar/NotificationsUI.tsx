import {Button, Column, Div} from "react-vcomponents";
import {AddGlobalStyle, BaseComponent} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {store} from "Store";
import {Observer} from "vwebapp-framework";
import {runInAction} from "mobx";
import {NotificationMessage} from "Store/main/@NotificationMessage";

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
		return (
			<ScrollView ref={c=>this.scrollView = c} className="NotificationScrollView" scrollVBarStyle={{width: 10}} style={{height: "100%"}} contentStyle={{willChange: "transform"}}>
				<Column ct style={{maxWidth: "calc(100% - 10px)", alignItems: "flex-start", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}>
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
					<Button // text={expanded ? "-" : "+"} size={28}
						style={{
							display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
							width: 18, padding: "2px 4px", fontSize: 13, lineHeight: "1px", // keeps text from making meta-theses too tall
							backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * 0.8).RoundTo(1)).join(",")},.7)`,
							// boxShadow: "none",
							border: "none",
							":hover": {backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * 0.9).RoundTo(1)).join(",")},.7)`},
						}}
						onClick={e=>{
							runInAction("MessageUI.RemoveMessage.onClick", ()=>store.main.notificationMessages.Remove(message));
						}}>
						X
					</Button>
				</div>
			</Div>
		);
	}
}