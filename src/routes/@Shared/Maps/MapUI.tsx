import {RootState} from "../../../store/reducers";
import {BaseComponent, FirebaseDatabase, FindDOM} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {Map} from "./Map";
import MapNodeUI from "./MapNodeUI";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./MapNode";
import {Debugger} from "../../../Frame/General/Globals_Free";
import {PropTypes} from "react";
import {Assert} from "../../../Frame/Serialization/VDF/VDF";
import V from "../../../Frame/V/V";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {Vector2i} from "../../../Frame/General/VectorStructs";
import {ACTMapNodeSelect} from "../../../store/Store/Main/MapViews";
var ScrollView = require("react-free-scrollbar").default;

type Props = {map: Map, rootNode?: MapNode};
@firebaseConnect(({map}: {map: Map})=> [
	map && DBPath(`nodes/${map.rootNode}`),
].Where(a=>!!a))
@(connect(({firebase}: RootState, {map}: Props)=> ({
	rootNode: map && GetData(firebase, `nodes/${map.rootNode}`),
})) as any)
export default class MapUI extends BaseComponent<Props, {} | void> {
	/*static childContextTypes = {
		//mapID: PropTypes.number.isRequired,
		map: PropTypes.object,
	};
	getChildContext() {
		let {map} = this.props;
		return {map};
	}*/
	downPos: Vector2i;
	render() {
		let {map, rootNode} = this.props;
		if (map == null)
			return <div>Loading map...</div>;
		Assert(map._key, "map._key is null!");
		if (rootNode == null)
			return <div>Loading root node...</div>;
		return (
			<ScrollView backgroundDrag={true} backgroundDragMatchFunc={a=>a == this.refs.content} scrollVBarStyles={{width: 10}} contentStyle={{willChange: "transform"}}
						/*bufferScrollEventsBy={100000}*/>
					<div id="MapUI" ref="content"
						style={{
							position: "relative", display: "flex", padding: "150px 5000px 5000px 870px", whiteSpace: "nowrap",
							filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 10px)",
						}}
						onMouseDown={e=>this.downPos = new Vector2i(e.clientX, e.clientY)}
						onClick={e=> {
							if (e.target != this.refs.content) return;
							if (new Vector2i(e.clientX, e.clientY).DistanceTo(this.downPos) >= 3) return;
							let mapView = store.getState().main.mapViews[store.getState().main.openMap];
							let isNodeSelected = GetTreeNodesInObjTree(mapView).Any(a=>a.prop == "selected" && a.Value);
							if (isNodeSelected)
								store.dispatch(new ACTMapNodeSelect({mapID: map._key.KeyToInt, path: null}));
						}}
						onContextMenu={e=> {
							e.preventDefault();
						}}>
					<MapNodeUI map={map} node={rootNode}/>
					<div style={{width: 1500}}/>
				</div>
			</ScrollView>
		);
	}
}