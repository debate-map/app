import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";

export default class ReputationPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				Reputation panel is under development.
			</div>
		);
	}
}