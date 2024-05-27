import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";
import {Column} from "react-vcomponents";

export class NotificationsPanel extends BaseComponent<{}, {}> {
	render() {

		const notifications = [
			{text: "Test notification 1", time: Date.now()},
			{text: "Test notification 2", time: Date.now()},
			{text: "Test notification 3", time: Date.now()},
		];

		return (
			<Column style={{
				width: 750, padding: 5, borderRadius: "0 0 0 5px",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
                {notifications.map((notification, index)=>{
                	return (
                        <div key={index} style={{padding: "5px 0", borderBottom: liveSkin.OverlayBorder()}}>
                            <div style={{fontSize: 14, color: "rgba(255,255,255,1)"}}>{notification.text}</div>
                            <div style={{fontSize: 12, color: "rgba(255,255,255,.5)"}}>{notification.time}</div>
                        </div>
                	);
                })}
			</Column>
		);
	}
}