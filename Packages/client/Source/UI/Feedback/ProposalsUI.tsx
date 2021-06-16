import {ProposalsUI as ProposalsUI_Base} from "firebase-feedback";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

export class ProposalsUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<ProposalsUI_Base subNavBarWidth={84}/>
		);
	}
}