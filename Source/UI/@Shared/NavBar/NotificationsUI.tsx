import {BaseComponent, Span, Div, AddGlobalStyle} from "../../../Frame/UI/ReactGlobals";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import NotificationMessage from "../../../Store/main/@NotificationMessage";
import Button from "../../../Frame/ReactComponents/Button";
import {ACTNotificationMessageRemove} from "../../../Store/main";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import ScrollView from "react-vscrollview";

AddGlobalStyle(`
.NotificationScrollView > * { pointer-events: auto; }
.NotificationScrollView { pointer-events: none; }
.NotificationScrollView > .content > * { pointer-events: auto; }
.NotificationScrollView > .content { pointer-events: none; }
`);

@Connect(state=> ({
	messages: state.main.notificationMessages,
}))
export default class NotificationsUI extends BaseComponent<{} & Partial<{messages: NotificationMessage[]}>, {}> {
	scrollView: ScrollView;
	render() {
		let {messages} = this.props;
		return (
			<ScrollView ref={c=>this.scrollView = c} className="NotificationScrollView" scrollVBarStyle={{width: 10}} contentStyle={{willChange: "transform"}}>
				<Column ct style={{maxWidth: "calc(100% - 10px)", alignItems: "flex-start", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}>
					{messages.map((message, index)=> {
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

/*export class MessageUI extends BaseComponent<{message: NotificationMessage}, {}> {
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
}*/
export class MessageUI extends BaseComponent<{message: NotificationMessage}, {}> {
	render() {
		let {message} = this.props;
		let backgroundColor = "40,60,80";
		return (
			<Div ml={10} mt={10} style={{position: "relative", borderRadius: 5, cursor: "default", boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
				<div style={{display: "flex", background: "rgba(0,0,0,.7)", borderRadius: 5, /*cursor: "pointer"*/}}>
					<div style={{position: "relative", padding: 5}}>
						<div style={{
							position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
							background: `rgba(${backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
						}}/>
						<Div sel style={{position: "relative", fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word"}}>
							{message.text}
						</Div>
					</div>
					<Button //text={expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, padding: "2px 4px", fontSize: 13, lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`, boxShadow: "none",
								":hover": {backgroundColor: `rgba(${backgroundColor.split(",").map(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTNotificationMessageRemove(message.id));
							}}>
						X
					</Button>
				</div>
			</Div>
		);
	}
}