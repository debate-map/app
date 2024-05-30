import {BaseComponent, BaseComponentPlus, UseMemo} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {Column, Div} from "react-vcomponents";
import {CommandRun, GetCommandRun, GetManyCommandRuns, GetNotifications, MeID} from "dm_common";
import {Observer} from "web-vcore";
import {CommandRunUI} from "../../Social/StreamUI.js";
import {RunCommand_UpdateNotification} from "../../../Utils/DB/Command.js";

@Observer
export class NotificationsPanel extends BaseComponent<{}, {}> {
	render() {
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
		return (
			<Div style={{
				width: 750, borderRadius: "0 0 0 5px",
				overflow: "hidden",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				{notifications.length == 0 && "No notifications."}
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
			</Div>
		);
	}
}