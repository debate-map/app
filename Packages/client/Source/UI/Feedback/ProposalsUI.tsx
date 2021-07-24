import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {ProposalsUI as ProposalsUI_Inner} from "web-vcore/nm/graphql-feedback.js";

export class ProposalsUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<ProposalsUI_Inner/>
		);
	}
}