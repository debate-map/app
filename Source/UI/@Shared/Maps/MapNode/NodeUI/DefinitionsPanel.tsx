import Column from "../../../../../Frame/ReactComponents/Column";
import {Div, BaseComponent} from "../../../../../Frame/UI/ReactGlobals";

export default class DefinitionsPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					Proponents of the thesis can submit and upvote their definitions of the terms. (thus clarifying their meaning)
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>Definitions panel is under development.</Div>
			</Column>
		);
	}
}