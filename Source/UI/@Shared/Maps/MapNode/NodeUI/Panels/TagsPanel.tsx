import {Div, Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

export class TagsPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					TODO
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Tags panel is under development.</Div>
			</Column>
		);
	}
}