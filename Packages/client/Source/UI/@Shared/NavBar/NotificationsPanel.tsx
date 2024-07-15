import {BaseComponent, UseMemo, cssHelper} from "react-vextensions";
import {Button, CheckBox, Column, Div, Row, Select, Text} from "react-vcomponents";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import {CommandRun, GetCommandRun, GetNotifications, MeID, Notification, SubscriptionLevel} from "dm_common";
import {E, GetEntries} from "js-vextensions";
import ReactList from "react-list";
import {CommandRunUI} from "../../Social/StreamUI.js";
import {RunCommand_UpdateNotification} from "../../../Utils/DB/Command.js";
import {GetMapState} from "../../../Store/main/maps/mapStates/$mapState.js";
import {GetOpenMapID} from "../../../Store/main.js";
import {store} from "../../../Store/index.js";

@Observer
export class NotificationsPanel extends BaseComponent<{}, {}, {
	notifications: (Notification & { command: CommandRun|n })[];
}> {
	renderItem = (index, key)=>{
		const {notifications} = this.stash;
		const notification = notifications[index];

		return (
			<Column key={key}
				style={E(
					{position: "relative", padding: 5},
					!notification.readTime && {backgroundColor: "rgba(0,0,0,0.15)"},
				)}
				onClick={()=>{
					RunCommand_UpdateNotification({id: notification.id, updates: {
						readTime: Date.now(),
					}});
				}}
			>
				{!notification.readTime &&
				<Div style={{
					position: "absolute", top: 6, left: 6, width: 8, height: 8,
					display: "flex", stroke: "red", pointerEvents: "none",
				}}>
					<svg width="100%" height="100%" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
				</Div>}
				{notification.command &&
				<CommandRunUI panel={true} key={index} run={notification.command!} index={index} last={index == notifications.length - 1}/>}
			</Column>
		);
	}

	render() {
		const mapState = GetMapState(GetOpenMapID());
		const uiState = store.main.notifications;

		const notifications = GetNotifications(MeID()).map(a=>{
			return {
				...a,
				command: a.commandRun ? GetCommandRun(a.commandRun) : null,
			};
		}).sort((a, b)=>{
			if (a.readTime == null && b.readTime != null) return -1;
			if (a.readTime != null && b.readTime == null) return 1;
			return (b.command?.runTime ?? 0) - (a.command?.runTime ?? 0);
		});

		this.Stash({notifications});

		const unreadCount = notifications.filter(a=>a.readTime == null).length;

		return (
			<Div style={{
				width: 750, borderRadius: "0 0 0 5px", overflow: "hidden",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				{notifications.length == 0 && "No notifications."}
				{notifications.length > 0 &&
				<Column style={
					{padding: 5, display: "flex", flexFlow: "row nowrap", justifyContent: "space-between", alignItems: "center"}
				}>
					<span style={{fontSize: 18, fontWeight: "bold"}}>Notifications</span>
					{unreadCount > 0 &&
					<Button text="Mark all as read" onClick={()=>{
						for (const notification of notifications) {
							if (notification.readTime == null) {
								RunCommand_UpdateNotification({id: notification.id, updates: {
									readTime: Date.now(),
								}});
							}
						}
					}}/>}
				</Column>}
				<Div style={{
					overflowY: "auto", height: 500,
				}}>
					<ReactList
						itemRenderer={this.renderItem}
						length={notifications.length}
						type='uniform'
					/>
				</Div>
				{mapState && <Row style={{padding: 5, alignItems: "center", justifyContent: "space-between"}}>
					<Row center style={{padding: "8px 0px"}}>
						<CheckBox ml="auto" text="Paint Mode" value={mapState.subscriptionPaintMode} onChange={val=>RunInAction_Set(this, ()=>{ mapState.subscriptionPaintMode = val; })}/>
						<InfoButton ml={5} text="When enabled, you can simply drag over nodes to set their subscription state."/>
					</Row>
					{mapState?.subscriptionPaintMode === true && <Row ml={10}>
						<Text>Notification level:</Text>
						<Select ml={5} displayType="button bar" options={GetEntries(SubscriptionLevel, "ui")} value={uiState.paintMode_notificationLevel} onChange={val=>{
							RunInAction_Set(this, ()=>uiState.paintMode_notificationLevel = val);
						}}/>
					</Row>}
				</Row>}
			</Div>
		);
	}
}