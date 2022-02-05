import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {liveSkin} from "Utils/Styles/SkinManager";

export class ChatPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", padding: 5, background: liveSkin.OverlayPanelBackgroundColor().css(), borderRadius: "0 0 5px 0"}}>
				Chat panel is under development.
			</div>
		);
	}
}