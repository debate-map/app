import {BaseComponent, SimpleShouldUpdate, Div} from "../../../Frame/UI/ReactGlobals";

export default class SearchPanel extends BaseComponent<{auth?}, {}> {
	render() {
		return (
			<div style={{display: "flex", flexDirection: "column", padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				Search panel is under development.
			</div>
		);
	}
}