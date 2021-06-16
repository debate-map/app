import {Div, Column} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

export class DiscussionPanel extends BaseComponent<{show: boolean}, {}> {
	render() {
		const {show} = this.props;
		return (
			<Column style={{position: "relative", display: show ? null : "none"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					TODO
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Discussion panel is under development.</Div>
			</Column>
		);
	}
}