import {BaseComponent} from "../../../Frame/UI/ReactGlobals";
import {MapNode} from "./MapNode";

export default class MapNodeUI extends BaseComponent<{node: MapNode}, {}> {
	render() {
		let {node} = this.props;
		return (
			<div>
				{node.title}
			</div>
		);
	}
}