import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";

export class ReputationPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{
				display: "flex", flexDirection: "column", padding: 5, borderRadius: "0 0 0 5px",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				Reputation panel is under development.
			</div>
		);
	}
}