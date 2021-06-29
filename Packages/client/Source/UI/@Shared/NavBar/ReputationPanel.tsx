import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";

export class ReputationPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				Reputation panel is under development.
			</div>
		);
	}
}