import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";

export class GuidePanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<div style={{
				display: "flex", flexDirection: "column", padding: 5, borderRadius: "0 0 0 5px",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				Guide panel is under development.
			</div>
		);
	}
}