import {Div, Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

export default class SocialPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					TODO
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Social panel is under development.</Div>
			</Column>
		);
	}
}