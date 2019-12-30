import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";

export class GuidePanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				Guide panel is under development.
			</div>
		);
	}
}