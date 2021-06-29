import {Div, Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

export class SocialPanel extends BaseComponent<{show: boolean}, {}> {
	render() {
		const {show} = this.props;
		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					TODO
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Social panel is under development.</Div>
			</Column>
		);
	}
}