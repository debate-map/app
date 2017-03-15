import {BaseComponent, Div, Span} from "../../../Frame/UI/ReactGlobals";
import {MapNode, MapNodePath, MapNodeType, MapNodeView, MapView} from "./MapNode";
import {firebaseConnect, helpers} from "react-redux-firebase";
import {connect} from "react-redux";
import {DBPath} from "../../../Frame/Database/DatabaseHelpers";
import {Debugger, QuickIncrement, EStrToInt} from "../../../Frame/General/Globals_Free";
import Button from "../../../Frame/ReactComponents/Button";
import {PropTypes} from "react";
import Action from "../../../Frame/General/Action";
import {RootState} from "../../../store/reducers";
import {Map} from "./Map";
import {map} from "lodash";

export class ACTSelectMapNode extends Action<{mapID: number, path: MapNodePath}> {}

interface Props {map: Map, nodeID: number, node: MapNode, path?: MapNodePath, nodeView?: MapNodeView, nodeChildren?: MapNode[]};
@firebaseConnect(({node}: {node: MapNode})=>[
	...(node.children || {}).VKeys().Select(a=>DBPath(`nodes/${a}`))
])
@(connect(({firebase, main}: RootState, {nodeID, node, path, map}: Props)=> ({
	nodeView: map && main.mapViews[EStrToInt(map._key)] && main.mapViews[EStrToInt(map._key)].As(MapView).GetViewForPath(path || new MapNodePath([nodeID])),
	nodeChildren: (node.children || {}).VKeys().Select(a=>helpers.dataToJS(firebase, DBPath(`nodes/${a}`))).Where(a=>a),
})) as any)
export default class MapNodeUI extends BaseComponent<Props, {}> {
	//static contextTypes = {map: PropTypes.object};
	render() {
		let {map, nodeID, node, path, nodeView, nodeChildren, children} = this.props;
		/*let {map} = this.context;
		if (map == null) return <div>Loading map, deep...</div>; // not sure why this occurs*/
		path = path || new MapNodePath([nodeID]);
		return (
			<div className="clickThrough" style={{display: "flex", padding: "3px 0"}}>
				<div className="clickThrough" style={{transform: "translateY(calc(50% - 13px))", zIndex: 2}}>
					<MapNodeUI_Inner mapID={EStrToInt(map._key)} nodeID={nodeID} node={node} nodeView={nodeView} path={path}/>
				</div>
				<div className="clickThrough" style={{marginLeft: 10, zIndex: 1}}>
					{nodeChildren.map((child, index)=> {
						let childID = EStrToInt(node.children.VKeys()[index]);
						return <MapNodeUI key={index} map={map} nodeID={childID} node={child} path={path.Extend(childID)}/>;
					})}
				</div>
			</div>
		);
	}
}

let nodeTypeBackgroundColors = {
	[MapNodeType.Category]: "40,60,80",
	[MapNodeType.Package]: "0,100,180",
	[MapNodeType.Thesis]: "0,100,180",
	[MapNodeType.PositiveArgument]: "0,100,180",
	[MapNodeType.NegativeArgument]: "0,100,180",
}
let nodeTypeFontSizes = {
	[MapNodeType.Category]: 16
}
class MapNodeUI_Inner extends BaseComponent<{mapID: number, nodeID: number, node: MapNode, nodeView: MapNodeView, path: MapNodePath}, {}> {
	//static contextTypes = {store: PropTypes.object.isRequired};
	render() {
		let {mapID, nodeID, node, nodeView, path} = this.props;
		//let {dispatch} = this.context.store;
		let backgroundColor = nodeTypeBackgroundColors[node.type];
		let fontSize = nodeTypeFontSizes[node.type] || 14;
		return (
			<div style={{
				display: "flex", position: "relative", borderRadius: 5, cursor: "pointer",
				boxShadow: "0 0 1px rgba(255,255,255,.5)",
				filter: "drop-shadow(rgba(0,0,0,1) 0px 0px 3px) drop-shadow(rgba(0,0,0,.35) 0px 0px 3px)",
			}}>
				{nodeView && nodeView.selected
					? <div style={{
						display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
						zIndex: 3, background: `rgba(${backgroundColor},.7)`, padding: 3, borderRadius: 5,
						boxShadow: "0 0 1px rgba(255,255,255,.5)",
					}}>
						<Button text="Agree" mr={7} style={{padding: "3px 7px"}}>
							<Span ml={5}>90%</Span>
						</Button>
						<Button text="Degree" enabled={false} mr={7} style={{padding: "3px 7px"}}>
							<Span ml={5}>70%</Span>
						</Button>
						<Button text="Disagree" mr={7} style={{padding: "3px 7px"}}>
							<Span ml={5}>0%</Span>
						</Button>
						<Button text="..." style={{padding: "3px 7px"}}/>
					</div>
					: <div
							style={{
								display: "flex", position: "absolute", transform: "translateX(calc(-100% - 2px))", whiteSpace: "nowrap", height: 28,
								zIndex: 3, borderRadius: 5,
							}}
							onClick={()=> {
								store.dispatch(new ACTSelectMapNode({mapID, path}));
							}}>
						<Div mt={7} mr={5}>90%</Div>
					</div>}
				<div style={{position: "relative", zIndex: 2, background: `rgba(${backgroundColor},.7)`, padding: 5, borderRadius: "5px 0 0 5px", cursor: "pointer"}}
						onClick={()=> {
							store.dispatch(new ACTSelectMapNode({mapID, path}));
						}}>
					<a style={{fontSize}}>{node.title}</a>
				</div>
				<Button text="+" size={28} style={{
					position: "relative", zIndex: 2, borderRadius: "0 5px 5px 0",
					width: 18, fontSize: 18, textAlign: "center", lineHeight: "28px",
					backgroundColor: `rgba(${backgroundColor},.5)`, boxShadow: "none",
					":hover": {backgroundColor: `rgba(${backgroundColor.split(",").Select(a=>parseInt(a) - 20).join(",")},.7)`},
				}}/>
			</div>
		);
	}
}