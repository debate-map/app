import {VMenuItem} from "react-vmenu/dist/VMenu";
import {MapNodeType, MapNode, MapNodeType_Info} from "../MapNode";
import {connect} from "react-redux";
import {MapNodeView, ACTMapNodeSelect, ACTMapNodeExpandedToggle} from "../../../../store/Store/Main/MapViews";
import {GetUserID, RootState, GetNodeRatingsRoot, GetPaths_NodeRatingsRoot, RatingsRoot} from "../../../../store/reducers";
import {Map} from "../Map";
import {BaseComponent} from "../../../../Frame/UI/ReactGlobals";
import MapNodeUI_LeftBox from "./NodeUI_LeftBox";
import VMenu from "react-vmenu";
import {ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import {styles} from "../../../../Frame/UI/GlobalStyles";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import {DN} from "../../../../Frame/General/Globals";
import {DataSnapshot} from "firebase";
import Button from "../../../../Frame/ReactComponents/Button";
import RatingsUI from "./RatingsUI";
import {firebaseConnect} from "react-redux-firebase";
import {CachedTransform} from "../../../../Frame/V/VCache";
import {RatingType_Info, RatingType} from "./RatingType";
import {WaitXThenRun} from "../../../../Frame/General/Timers";
import keycode from "keycode";

type Props = {map: Map, node: MapNode, nodeView: MapNodeView, path: string, width: number, widthOverride?: number} & Partial<{userID: string, ratingsRoot: RatingsRoot}>;
@firebaseConnect(({node}: Props)=>[
	...GetPaths_NodeRatingsRoot({node}),
])
@(connect(()=> {
	return (state: RootState, {node, ratingsRoot}: Props)=> ({
		userID: GetUserID(state),
		ratingsRoot: GetNodeRatingsRoot(state, {node}),
	}) as any;
}) as any)
export default class NodeUI_Inner extends BaseComponent<Props, {hovered: boolean, openPanel_preview: string}> {
	render() {
		let {firebase, map, node, nodeView, path, width, widthOverride, userID, ratingsRoot} = this.props;
		let {hovered, openPanel_preview} = this.state;
		let nodeTypeInfo = MapNodeType_Info.for[node.type];
		let barSize = 5;
		let pathNodeIDs = path.split("/").Select(a=>parseInt(a));

		let mainRatingSet = ratingsRoot && ratingsRoot[nodeTypeInfo.mainRatingTypes[0]];
		let mainRatingAverage = CachedTransform("getMainRatingAverage", {nodeKey: node._key, ratingType: nodeTypeInfo.mainRatingTypes[0]}, {ratingSet: mainRatingSet},
			()=>mainRatingSet ? mainRatingSet.Props.Where(a=>a.name != "_key").Select(a=>a.value.value).Average() : 0);

		let leftPanelShow = (nodeView && nodeView.selected) || hovered;
		let panelToShow = openPanel_preview || (nodeView && nodeView.openPanel);
		let bottomPanelShow = leftPanelShow && panelToShow;

		return (
			<div className={`NodeUI_Inner${pathNodeIDs.length == 0 ? " root" : ""}`} style={{
						display: "flex", position: "relative", borderRadius: 5, cursor: "default",
						boxShadow: `rgba(0,0,0,1) 0px 0px 2px`, width, minWidth: widthOverride,
					}}
					onMouseEnter={()=>this.SetState({hovered: true})} onMouseLeave={()=>this.SetState({hovered: false})}
					onClick={e=> {
						if ((e.nativeEvent as any).ignore) return;
						if (nodeView == null || !nodeView.selected)
							store.dispatch(new ACTMapNodeSelect({mapID: map._key.KeyToInt, path}));
					}}>
				{leftPanelShow &&
					<MapNodeUI_LeftBox parent={this} map={map} path={path} node={node} nodeView={nodeView} ratingsRoot={ratingsRoot}
						backgroundColor={nodeTypeInfo.backgroundColor} asHover={hovered}/>}
				{/* fixes click-gap */}
				{leftPanelShow &&
					<div style={{
						position: "absolute",
						right: "100%", width: 1, top: 0, bottom: 0,
						//left: -50, width: 100, top: 0, bottom: 0,
					}}/>}

				<div style={{
							display: "flex", width: "100%", //background: `rgba(${backgroundColor},.7)`,
							background: "rgba(0,0,0,.7)", borderRadius: 5, cursor: "pointer",
						}}>
					<div style={{
								position: "relative", width: "100%", //minWidth: minWidth - 20, maxWidth: maxWidth - 20,
								padding: 5, //node.type == MapNodeType.Category || node.type == MapNodeType.Package ? 5 : "3px 5px",
							}}>
						<div style={{
								position: "absolute", left: 0, top: 0, bottom: 0,
								width: mainRatingAverage + "%", background: `rgba(${nodeTypeInfo.backgroundColor},.7)`, borderRadius: "5px 0 0 5px"
							}}/>
						<a style={{position: "relative", fontSize: nodeTypeInfo.fontSize, whiteSpace: "initial"}}>
							{node.title}
						</a>
						<VMenu contextMenu={true} onBody={true}>
							{MapNodeType_Info.for[node.type].childTypes.map(childType=> {
								let childTypeInfo = MapNodeType_Info.for[childType];
								return (
									<VMenuItem key={childType} text={`Add ${childTypeInfo.displayName}`} style={styles.vMenuItem} onClick={e=> {
										if (e.button != 0) return;
										let title = "";
										let boxController = ShowMessageBox({
											title: `Add ${childTypeInfo.displayName}`, cancelButton: true,
											messageUI: ()=>(
												<div style={{padding: "10px 0"}}>
													Title: <TextInput //autoFocus={true}
														ref={a=>a && WaitXThenRun(0, ()=>a.DOM.focus())}
														onKeyDown={e=> {
															if (e.keyCode != keycode.codes.enter) return;
															boxController.options.onOK();
															boxController.Close();
														}}
														value={title} onChange={val=>DN(title = val, boxController.UpdateUI())}/>
												</div>
											),
											onOK: ()=> {
												firebase.Ref("nodes").transaction(nodes=> {
													if (!nodes) return nodes;

													let newID = (nodes as Object).Props.Select(a=>a.name.KeyToInt).Max() + 1;
													nodes[node._key].children = {
														...nodes[node._key].children,
														[newID.IntToKey]: {_: true}
													};
													nodes[newID.IntToKey] = new MapNode({
														type: childType, title,
														creator: userID, approved: true,
													});
													return nodes;
												}, undefined, false);
											}
										});
									}}/>
								);
							})}
							<VMenuItem text="Delete" style={styles.vMenuItem} onClick={e=> {
								if (e.button != 0) return;
								firebase.Ref("nodes").once("value", (snapshot: DataSnapshot)=> {
									let nodes = (snapshot.val() as Object).Props.Select(a=>a.value.Extended({_key: a.name}));
									let parentNodes = nodes.Where(a=>a.children && a.children[node._key]);
									let s_ifParents = parentNodes.length > 1 ? "s" : "";
									ShowMessageBox({
										title: `Delete "${node.title}"`, cancelButton: true,
										message: `Delete the node "${node.title}", and its link${s_ifParents} with ${parentNodes.length} parent-node${s_ifParents}?`,
										onOK: ()=> {
											firebase.Ref("nodes").transaction(nodes=> {
												if (!nodes) return nodes;
												for (let parent of parentNodes)
													nodes[parent._key].children[node._key] = null;
												nodes[node._key] = null;
												return nodes;
											}, undefined, false);
										}
									});
								});
							}}/>
						</VMenu>
					</div>
					<Button //text={nodeView && nodeView.expanded ? "-" : "+"} size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 18, padding: 0,
								//fontSize: 18,
								fontSize: nodeView && nodeView.expanded ? 23 : 17,
								//lineHeight: "28px",
								//backgroundColor: `rgba(${backgroundColor},.5)`,
								backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").Select(a=>(parseInt(a) * .8).RoundTo(1)).join(",")},.7)`,
								boxShadow: "none",
								":hover": {backgroundColor: `rgba(${nodeTypeInfo.backgroundColor.split(",").Select(a=>(parseInt(a) * .9).RoundTo(1)).join(",")},.7)`},
							}}
							onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedToggle({mapID: map._key.KeyToInt, path}));
								//return false;
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
							}}>
						{nodeView && nodeView.expanded ? "-" : "+"}
					</Button>
				</div>
				{bottomPanelShow &&
					<div style={{
								position: "absolute", top: "calc(100% + 1px)", width: width, minWidth: (widthOverride|0).KeepAtLeast(550), zIndex: hovered ? 6 : 5,
								padding: 5, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`,
							}}>
						<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${nodeTypeInfo.backgroundColor},.7)`}}/>
						{RatingType_Info.for[panelToShow] &&
							<RatingsUI node={node} path={path} ratingType={panelToShow as RatingType}
								ratings={ratingsRoot && ratingsRoot[panelToShow] ? ratingsRoot[panelToShow].Props.Where(a=>a.name != "_key").Select(a=>a.value) : []}/>}
						{panelToShow == "definitions" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									Proponents of the thesis can submit and upvote their definitions of the terms. (thus clarifying their meaning)
								</div>
							</div>}
						{panelToShow == "questions" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									Questions can be asked here concerning clarification of the statement's meaning. (other comments belong in the "Discuss" panel)
								</div>
							</div>}
						{panelToShow == "history" &&
							<div style={{position: "relative"}}>
								<div style={{position: "relative", fontSize: 12, whiteSpace: "initial"}}>
									NodeID: {node._key.KeyToInt}
								</div>
							</div>}
					</div>}
			</div>
		);
	}
}