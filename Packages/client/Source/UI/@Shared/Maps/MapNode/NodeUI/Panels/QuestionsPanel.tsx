import {Div, Column} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

export class QuestionsPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					Questions can be asked here concerning clarification of the statement's meaning. (other comments belong in the "Discuss" panel)
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Questions panel is under development.</Div>
			</Column>
		);
	}
}