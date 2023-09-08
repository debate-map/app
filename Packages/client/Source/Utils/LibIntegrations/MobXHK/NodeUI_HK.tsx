import {Observer} from "web-vcore";
import {Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {GetNode_HK} from "./HKStore";

@Observer
export class NodeUI_HK extends BaseComponent<{nodeID: string}, {}> {
	render() {
		const {nodeID} = this.props;

		const node = GetNode_HK(nodeID);
		if (node == null) return <div>Loading...</div>;

		return (
			<Row style={{
				background: "rgba(0,0,0,.3)", borderRadius: 5, padding: "3px 7px",
				marginLeft: 1000, marginTop: 500,
			}}>
				{node.title["@value"]}
			</Row>
		);
	}
}