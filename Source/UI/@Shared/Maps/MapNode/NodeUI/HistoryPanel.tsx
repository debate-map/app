import Column from "../../../../../Frame/ReactComponents/Column";
import {Div, BaseComponent} from "../../../../../Frame/UI/ReactGlobals";

export default class HistoryPanel extends BaseComponent<{}, {}> {
	render() {
		return (
			<Column style={{position: "relative"}}>
				{/*<div style={{fontSize: 12, whiteSpace: "initial"}}>
					TODO
				</div>*/}
				<Div style={{fontSize: 12, color: "rgba(255, 255, 255, 0.5)"}}>History panel is under development.</Div>
			</Column>
		);
	}
}