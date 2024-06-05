import {BaseComponent, UseMemo, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {Button, CheckBox, Column, Div, Row, Select, Text} from "web-vcore/nm/react-vcomponents.js";
import {InfoButton, Observer, RunInAction_Set} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager";
import {GetCommandRun, GetNotifications, MeID} from "dm_common";
import {GetEntries} from "web-vcore/nm/js-vextensions.js";
import {CommandRunUI} from "../../Social/StreamUI.js";
import {RunCommand_UpdateNotification} from "../../../Utils/DB/Command.js";
import {GetMapState} from "../../../Store/main/maps/mapStates/$mapState.js";
import {GetOpenMapID} from "../../../Store/main.js";
import {store} from "../../../Store/index.js";
import {SubscriptionLevel} from "../Maps/Node/NodeBox/NodeNotificationControl.js";

@Observer
export class NotificationsPanel extends BaseComponent<{}, {}> {
	render() {
		const mapState = GetMapState(GetOpenMapID());
		const uiState = store.main.notifications;

		const notifications_raw = GetNotifications(MeID());
		const notifications = UseMemo(()=>notifications_raw.map(a=>{
			return {
				...a,
				command: a.commandRun ? GetCommandRun(a.commandRun) : null,
			};
		}).sort((a, b)=>{
			if (a.readTime == null && b.readTime != null) return -1;
			if (a.readTime != null && b.readTime == null) return 1;
			return (b.command?.runTime ?? 0) - (a.command?.runTime ?? 0);
		}), [notifications_raw]);

		const entryLimit = 5; // for now, only show the last 5 notifications (need a paging system or the like)

		const unreadCount = UseMemo(()=>notifications.filter(a=>a.readTime == null).length, [notifications]);

		return (
			<Div style={{
				width: 750, borderRadius: "0 0 0 5px",
				overflow: "hidden",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				{notifications.length == 0 && "No notifications."}
				{notifications.length > 0 && <Column style={
					{padding: 5, display: "flex", flexFlow: "row nowrap", justifyContent: "space-between", alignItems: "center"}
				}>
					<span style={{fontSize: 18, fontWeight: "bold"}}>Notifications</span>
					{unreadCount > 0 && <Button text="Mark as Read" onClick={()=>{
						for (const notification of notifications_raw) {
							if (notification.readTime == null) {
								RunCommand_UpdateNotification({id: notification.id, updates: {
									readTime: Date.now(),
								}});
							}
						}
					}}/>
}
				</Column>}
				{notifications.Take(entryLimit).map((notification, index)=>{
					return <Column style={{
						position: "relative",
						padding: 5,
					}} key={notification.id}>
						{!notification.readTime && <Div onClick={()=>{
							RunCommand_UpdateNotification({id: notification.id, updates: {
								readTime: Date.now(),
							}});
						}} style={{position: "absolute", top: 0, bottom: 0, right: 0, left: 0, backgroundColor: "rgba(0,0,0,0.15)"}}>
							<Div style={{
								position: "absolute", top: 6, left: 6,
								width: 8, height: 8,
								stroke: "red",
								display: "flex",
							}}>
								<svg width="100%" height="100%" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg">
									<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
							</Div>
						</Div>}
						{notification.command &&
							<CommandRunUI panel={false} key={index} run={notification.command!} index={index} last={index == notifications.length - 1} />
						}
					</Column>;
				})}
				<Row style={{
					padding: 5,
					flexWrap: "nowrap", alignItems: "center",
				}}>
					<Row style={{
						display: "flex", flexWrap: "nowrap", alignItems: "center",
					}}>
						<CheckBox ml="auto" text="Paint Mode" value={mapState?.subscriptionPaintMode ?? false} onChange={val=>RunInAction_Set(this, ()=>{ if (mapState) mapState.subscriptionPaintMode = val; })} />
						<InfoButton ml={5} text="When enabled, paint mode allows you to more simply select nodes you are subscribed to" />
					</Row>
					<Row ml={10}>
						<Text>Notification level:</Text>
						<Select ml={5} displayType="button bar" options={GetEntries(SubscriptionLevel, "ui")} value={uiState.paintMode_notificationLevel} onChange={val=>{
							RunInAction_Set(this, ()=>uiState.paintMode_notificationLevel = val);
						}}/>
					</Row>
					<Column ml="auto" style={{
						flexWrap: "nowrap", alignItems: "flex-start",
					}}>
						<Row style={{
							flexWrap: "nowrap", alignItems: "center", gap: 4,
						}}>
							<div style={{
								width: 8, height: 8,
								borderRadius: "50%",
								border: "1px solid black",
								background: "none",
							}}/>
							<span style={{fontSize: 10}}>No Notifications</span>
						</Row>
						<Row style={{
							flexWrap: "nowrap", alignItems: "center", gap: 4,
						}}>
							<div style={{
								width: 8, height: 8,
								borderRadius: "50%",
								border: "1px solid yellow",
								background: "yellow",
							}}/>
							<span style={{fontSize: 10}}>Partial Notifications</span>
						</Row>
						<Row style={{
							flexWrap: "nowrap", alignItems: "center", gap: 4,
						}}>
							<div style={{
								width: 8, height: 8,
								borderRadius: "50%",
								border: "1px solid green",
								background: "green",
							}}/>
							<span style={{fontSize: 10}}>All Notifications</span>
						</Row>
					</Column>
				</Row>
			</Div>
		);
	}
}