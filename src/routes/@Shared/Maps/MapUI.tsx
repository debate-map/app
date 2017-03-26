import {RootState} from "../../../store/reducers";
import {BaseComponent, FirebaseDatabase, FindDOM, FindReact} from "../../../Frame/UI/ReactGlobals";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {Route} from "react-router-dom";
import {connect} from "react-redux";
import {Map} from "./Map";
import {DBPath, GetData} from "../../../Frame/Database/DatabaseHelpers";
import {MapNode} from "./MapNode";
import {Debugger} from "../../../Frame/General/Globals_Free";
import {PropTypes} from "react";
import {Assert, Log} from "../../../Frame/Serialization/VDF/VDF";
import V from "../../../Frame/V/V";
import {GetTreeNodesInObjTree} from "../../../Frame/V/V";
import {Vector2i, VRect} from "../../../Frame/General/VectorStructs";
import {ACTMapNodeSelect, ACTViewCenterChange} from "../../../store/Store/Main/MapViews";
import NodeUI from "./MapNode/NodeUI";
import ScrollView from "react-vscrollview";
import {GetDistanceBetweenRectAndPoint} from "../../../Frame/General/Geometry";
import NodeUI_Inner from "./MapNode/NodeUI_Inner";

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
						/*bufferScrollEventsBy={100000}*/
						onScrollEnd={pos=> {
							//Log("ScrollEnd:" + pos.x + ";" + pos.y);
							//let rootBox = $(".NodeUI_Inner.root");
							let viewCenter_onScreen = new Vector2i(window.innerWidth / 2, window.innerHeight / 2);
							let closestNodeBox = $(".NodeUI_Inner").ToList().Min(nodeBox=> {
								/*let nodeBoxRect_onScreen = new VRect(nodeBox[0].getBoundingClientRect().left, nodeBox[0].getBoundingClientRect().top,
									nodeBox.outerWidth(), nodeBox.outerHeight());
								return GetDistanceBetweenRectAndPoint(nodeBoxRect_onScreen, viewCenter_onScreen);*/
								return GetDistanceBetweenRectAndPoint(nodeBox.GetScreenRect(), viewCenter_onScreen);
							});
							let closestNodeBoxComp = FindReact(closestNodeBox[0]) as NodeUI_Inner;
							let closestNode_path = closestNodeBoxComp.props.path;
							let viewOffset = viewCenter_onScreen.Minus(closestNodeBox.GetScreenRect().Position);
							store.dispatch(new ACTViewCenterChange({mapID: closestNodeBoxComp.props.map._key.KeyToInt, focusNode: closestNode_path, viewOffset}));
						}}>
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
					<NodeUI map={map} node={rootNode}/>
					<div style={{width: 1500}}/>
				</div>
			</ScrollView>
		);
	}
}

declare global { interface JQuery { ToList(): JQuery[]; }}
$.fn.ToList = function(this: JQuery) { return this.toArray().map(a=>$(a)); }
/*declare global { interface JQuery { PositionFrom(referenceControl: JQuery): Vector2i; }}
//$.fn.positionFrom = function(referenceControl, useCloneToCalculate = false) {
$.fn.PositionFrom = function(referenceControl) {
	/*if (useCloneToCalculate) { // 'this' must be descendent of 'referenceControl', for this code to work
		$(this).attr("positionFrom_temp_controlB", true);
		//$(this).data("positionFrom_temp_controlB", true);
		if (!$(this).parents().toArray().Contains(referenceControl[0]))
			throw new Error("'this' must be descendent of 'referenceControl'.");
		var referenceControl_clone = referenceControl.clone(true).appendTo("#hiddenTempHolder");
		var this_clone = referenceControl_clone.find("[positionFrom_temp_controlB]");
		//var this_clone = referenceControl_clone.find(":data(positionFrom_temp_controlB)");
		var result = this_clone.positionFrom(referenceControl_clone);
		referenceControl_clone.remove();
		$(this).attr("positionFrom_temp_controlB", null);
		//$(this).data("positionFrom_temp_controlB", null);
		return result;
	}*#/

	var offset = $(this).offset();
	var referenceControlOffset = referenceControl.offset();
	return new Vector2i(offset.left - referenceControlOffset.left, offset.top - referenceControlOffset.top);
};*/
declare global { interface JQuery { GetOffsetRect(): VRect; }}
$.fn.GetOffsetRect = function(this: JQuery) {
	return new VRect(this[0].clientLeft, this[0].clientTop, this.outerWidth(), this.outerHeight());
};
declare global { interface JQuery { GetScreenRect(): VRect; }}
$.fn.GetScreenRect = function(this: JQuery) {
	var clientRect = this[0].getBoundingClientRect();
	return new VRect(clientRect.left, clientRect.top, clientRect.width, clientRect.height);
};