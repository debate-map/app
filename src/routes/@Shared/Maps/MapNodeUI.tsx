import {BaseComponent} from "../../../Frame/UI/ReactGlobals";
import {MapNode} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement} from "../../../Frame/General/Globals_Free";

var MapNodeUI_Final: typeof MapNodeUI;

@firebaseConnect(({node}: {node: MapNode})=>[
	...(node.children || {}).VKeys().Select(a=>DBPath(`nodes/${a}`))
])
@(connect(({firebase}, {node, parents}: {node: MapNode, parents})=> {
	return {
		nodeChildren: (node.children || {}).VKeys().Select(a=>helpers.dataToJS(firebase, DBPath(`nodes/${a}`))).Where(a=>a)
	};
}) as any)
export default class MapNodeUI extends BaseComponent<{node: MapNode, nodeChildren?: MapNode[], parents?: MapNode[]}, {}> {
	static defaultProps = {parents: []};
	render() {
		let {node, nodeChildren, children} = this.props;
		return (
			<div style={{display: "flex"}}>
				<div style={{transform: "translateY(calc(50% - 13px))"}}>
					<MapNodeUI_Inner node={node}/>
				</div>
				<div style={{marginLeft: 10}}>
					{nodeChildren.map((child, index)=> {
						let parents = this.props.parents;
						if (QuickIncrement("test1") > 1000) debugger;
						if (parents.length > 10)
							return <div>{child.title}</div>;
						return <MapNodeUI_Final key={index} node={child} parents={this.props.parents.concat(node)}/>;
					})}
				</div>
			</div>
		);
	}
}

MapNodeUI_Final = MapNodeUI;

class MapNodeUI_Inner extends BaseComponent<{node: MapNode}, {}> {
	render() {
		let {node} = this.props;
		return (
			<div style={{background: "rgba(0,0,0,.75)", padding: 5}}>
				<a>{node.title}</a>
			</div>
		);
	}
}