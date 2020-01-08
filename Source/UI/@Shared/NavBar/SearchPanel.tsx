import {CollectionReference, Query} from "@firebase/firestore-types";
import {SleepAsync, Vector2i, WaitXThenRun, E} from "js-vextensions";
import keycode from "keycode";
import Moment from "moment";
import {Button, Column, Pre, Row, TextInput} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {ScrollView} from "react-vscrollview";
import {GetSearchTerms_Advanced} from "Server/Commands/AddNodeRevision";
import {GetRootNodeID} from "Store/firebase/maps/$map";
import {GetNodeRevision} from "Store/firebase/nodeRevisions";
import {AsNodeL3, GetAllNodeRevisionTitles, GetNodeDisplayText, GetNodeL2} from "Store/firebase/nodes/$node";
import {GetNodeColor, MapNodeType_Info} from "Store/firebase/nodes/@MapNodeType";
import {GetUser} from "Store/firebase/users";
import {EB_ShowError, EB_StoreError, InfoButton, LogWarning, Observer, O, Validate} from "vwebapp-framework";
import {UUID} from "Utils/General/KeyGenerator";
import {ES} from "Utils/UI/GlobalStyles";
import {store} from "Store";
import {GetOpenMapID} from "Store/main";
import {MapNodeView, MapView, ACTMapViewMerge} from "Store/main/maps/mapViews/$mapView";
import {DBPath, GetAsync} from "mobx-firelink";
import {fire} from "Utils/LibIntegrations/MobXFirelink";
import {runInAction, flow} from "mobx";
import {MapNodeL2} from "Store/firebase/nodes/@MapNode";
import {GetNode} from "Store/firebase/nodes";
import {GetMap} from "Store/firebase/maps";
import {MapType} from "Store/firebase/maps/@Map";
import {NodeUI_Menu_Stub} from "../Maps/MapNode/NodeUI_Menu";
import {MapUI} from "../Maps/MapUI";

const columnWidths = [0.68, 0.2, 0.12];

@Observer
export class SearchPanel extends BaseComponentPlus({} as {}, {}, {} as {queryStr: string}) {
	async PerformSearch() {
		let {queryStr} = this.stash;
		const unrestricted = queryStr.endsWith(" /unrestricted");
		if (unrestricted) {
			queryStr = queryStr.slice(0, -" /unrestricted".length);
		}

		// first clear the old results
		runInAction("SearchPanel.PerformSearch_part1", ()=>{
			store.main.search.searchResults_partialTerms = [];
			store.main.search.searchResults_nodeRevisionIDs = null;
		});

		if (Validate("UUID", queryStr) == null) {
			const nodeRevisionMatch = await GetAsync(()=>GetNodeRevision(queryStr));
			if (nodeRevisionMatch) {
				runInAction("SearchPanel.PerformSearch_part2_nodeRevisionID", ()=>{
					store.main.search.searchResults_nodeRevisionIDs = [nodeRevisionMatch._key];
				});
				return;
			}
			const node = await GetAsync(()=>GetNode(queryStr));
			if (node) {
				runInAction("SearchPanel.PerformSearch_part2_nodeID", ()=>{
					store.main.search.searchResults_nodeRevisionIDs = [node.currentRevision];
				});
				return;
			}
		}

		const searchTerms = GetSearchTerms_Advanced(queryStr);
		if (searchTerms.wholeTerms.length == 0 && !unrestricted) return;
		let query = fire.subs.firestoreDB.collection(DBPath({}, "nodeRevisions")) as CollectionReference | Query;
		for (const term of searchTerms.wholeTerms) {
			query = query.where(`titles.allTerms.${term}`, "==", true);
		}

		// perform the actual search and show the results
		const {docs} = await query.get();
		const docIDs = docs.map(a=>a.id);
		runInAction("SearchPanel.PerformSearch_part2", ()=>{
			store.main.search.searchResults_partialTerms = searchTerms.partialTerms;
			store.main.search.searchResults_nodeRevisionIDs = docIDs;
		});
	}

	render() {
		const {searchResults_partialTerms} = store.main.search;
		const searchResultIDs = store.main.search.searchResults_nodeRevisionIDs;

		let results_nodeRevisions = searchResultIDs == null ? null : searchResultIDs.map(revisionID=>GetNodeRevision(revisionID));
		// after finding node-revisions matching the whole-terms, filter to those that match the partial-terms as well
		if (searchResults_partialTerms.length) {
			for (const term of searchResults_partialTerms) {
				results_nodeRevisions = results_nodeRevisions.filter(a=>{
					const titles = GetAllNodeRevisionTitles(a);
					return titles.Any(a=>a.toLowerCase().includes(term));
				});
			}
		}

		const results_nodeIDs = results_nodeRevisions?.filter(a=>a).map(a=>a.node).Distinct();
		const {queryStr} = store.main.search;

		this.Stash({queryStr});
		return (
			<Column style={{width: 750, padding: 5, background: "rgba(0,0,0,.7)", borderRadius: "0 0 0 5px"}}>
				<Row center>
					<TextInput style={{flex: 1}} value={queryStr}
						onChange={val=>{
							runInAction("SearchPanel.searchInput.onChange", ()=>store.main.search.queryStr = val);
						}}
						onKeyDown={e=>{
							if (e.keyCode == keycode.codes.enter) {
								this.PerformSearch();
							}
						}}/>
					<InfoButton ml={5} text={`
						Wildcards can be used, but there must be at least one non-wildcard term. Example: climate chang*

						(You can also enter the exact ID of a node or node-revision, to see the single matching node.)
					`.AsMultiline(0)}/>
					<Button ml={5} text="Search" onClick={()=>this.PerformSearch()}/>
				</Row>
				{/* <Row style={{ fontSize: 18 }}>Search results ({results_nodeIDs.length})</Row> */}
				<Column mt={5} className="clickThrough" style={{height: 40, background: "rgba(0,0,0,.7)", borderRadius: 10}}>
					{/* <Row style={{ height: 40, padding: 10 }}>
						<Pre>Sort by: </Pre>
						<Select options={GetEntries(SortType, name => EnumNameToDisplayName(name))}
							value={sortBy} onChange={val => store.dispatch(new ACTMapNodeListSortBySet({ mapID: map._id, sortBy: val }))}/>
						<Row width={200} style={{ position: 'absolute', left: 'calc(50% - 100px)' }}>
							<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
								enabled={page > 0} onClick={() => {
									// store.dispatch(new ACTMapNodeListPageSet({mapID: map._id, page: page - 1}));
									store.dispatch(new ACTMapNodeListPageSet({ mapID: map._id, page: page - 1 }));
								}}/>
							<Div ml={10} mr={7}>Page: </Div>
							<TextInput mr={10} pattern="[0-9]+" style={{ width: 30 }} value={page + 1}
								onChange={(val) => {
									if (!IsNumberString(val)) return;
									store.dispatch(new ACTMapNodeListPageSet({ mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage) }));
								}}/>
							<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
								enabled={page < lastPage} onClick={() => {
									store.dispatch(new ACTMapNodeListPageSet({ mapID: map._id, page: page + 1 }));
								}}/>
							</Row>
					</Row> */}
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 17}}>Title</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 17}}>Creator</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 17}}>Creation date</span>
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={{paddingTop: 10}} onContextMenu={e=>{
					if (e.nativeEvent["passThrough"]) return true;
					e.preventDefault();
				}}>
					{results_nodeIDs == null && "Search in progress..."}
					{results_nodeIDs && results_nodeIDs.length == 0 && "No search results."}
					{results_nodeIDs && results_nodeIDs.length > 0 && results_nodeIDs.map((nodeID, index)=>{
						return (
							// <ErrorBoundary key={nodeID}>
							<SearchResultRow key={nodeID} nodeID={nodeID} index={index}/>
						);
					})}
				</ScrollView>
			</Column>
		);
	}
}

@Observer
export class SearchResultRow extends BaseComponentPlus({} as {nodeID: string, index: number}, {}) {
	/* ComponentWillReceiveProps(props) {
		const { nodeID, rootNodeID, findNode_state, findNode_node } = props;
		if (findNode_node === nodeID) {
			if (findNode_state === 'activating') {
				store.dispatch(new ACTSet(a => a.main.search.findNode_state, 'active'));
				this.StartFindingPathsFromXToY(rootNodeID, nodeID);
			}
		}
	} */
	async StartFindingPathsFromRootsToX(targetNodeY: UUID) {
	// StartFindingPathsFromXToY = flow(function* StartFindingPathsFromXToY(rootNodeX: UUID, targetNodeY: UUID) {
		const searchDepth = 100;

		const upPathCompletions = [];
		let upPathAttempts = [`${targetNodeY}`];
		for (let depth = 0; depth < searchDepth; depth++) {
			const newUpPathAttempts = [];
			for (const upPath of upPathAttempts) {
				const nodeID = upPath.split("/").First();
				const node = await GetAsync(()=>GetNodeL2(nodeID));
				// const node = (yield GetAsync(() => GetNodeL2(nodeID))) as MapNodeL2;
				if (node == null) {
					LogWarning(`Could not find node #${nodeID}, as parent of #${upPath.split("/").XFromLast(1)}.`);
					continue;
				}

				if (node.rootNodeForMap != null) {
					upPathCompletions.push(upPath);
					// continue; // commented; node may be a map-root, and still have parents
				}

				for (const parentID of (node.parents || {}).Pairs().map(a=>a.key)) {
					const newUpPath = `${parentID}/${upPath}`;
					newUpPathAttempts.push(newUpPath);
				}
			}
			upPathAttempts = newUpPathAttempts;

			// if (depth === 0 || upPathCompletions.length !== State(a => a.main.search.findNode_resultPaths).length) {
			runInAction("SearchResultRow.StartFindingPathsFromXToY_inLoop", ()=>{
				store.main.search.findNode_resultPaths = upPathCompletions.slice();
				store.main.search.findNode_currentSearchDepth = depth + 1;
			});

			await SleepAsync(100);
			// yield SleepAsync(100);
			// if we have no more up-path-attempts to follow, or comp gets unmounted, start stopping search
			if (upPathAttempts.length == 0 || this.mounted === false) break;
			// if (upPathAttempts.length == 0) this.StopSearch();
			// if search is marked as "starting to stop", actually stop search here by breaking the loop
			if (store.main.search.findNode_state === "inactive") break;
		}

		this.StopSearch();
	}
	StopSearch() {
		runInAction("SearchResultRow.StopSearch", ()=>store.main.search.findNode_state = "inactive");
	}

	componentDidCatch(message, info) { EB_StoreError(this, message, info); }
	// searchInProgress = false;
	static searchInProgress = false;
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {nodeID, index} = this.props;
		const node = GetNodeL2(nodeID);
		const creator = node ? GetUser(node.creator) : null;

		const mapID = GetOpenMapID();
		const rootNodeID = GetRootNodeID(GetOpenMapID());

		const {findNode_state} = store.main.search;
		const {findNode_node} = store.main.search;
		if (findNode_state === "activating" && findNode_node == nodeID && !SearchResultRow.searchInProgress) {
			SearchResultRow.searchInProgress = true;
			WaitXThenRun(0, ()=>{
				runInAction("SearchResultRow.call_StartFindingPathsFromXToY_pre", ()=>store.main.search.findNode_state = "active");
				this.StartFindingPathsFromRootsToX(nodeID).then(()=>SearchResultRow.searchInProgress = false);
			});
		}
		const {findNode_resultPaths} = store.main.search;
		const {findNode_currentSearchDepth} = store.main.search;

		// if (node == null) return <Row>Loading... (#{nodeID})</Row>;
		if (node == null) return <Row></Row>;

		const nodeL3 = AsNodeL3(node);
		const path = `${node._key}`;

		const backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		const nodeTypeInfo = MapNodeType_Info.for[node.type];

		return (
			<Column>
				<Row mt={index === 0 ? 0 : 5} className="cursorSet"
					style={E(
						{padding: 5, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)"},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						this.SetState({menuOpened: true});
					}}>
					<span style={{flex: columnWidths[0]}}>{GetNodeDisplayText(node, path)}</span>
					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
					<span style={{flex: columnWidths[2]}}>{Moment(node.createdAt).format("YYYY-MM-DD")}</span>
					{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
					<NodeUI_Menu_Stub {...{node: nodeL3, path: `${node._key}`, inList: true}}/>
				</Row>
				{findNode_node === nodeID &&
					<Row>
						{findNode_state === "active" && <Pre>Finding in map... (depth: {findNode_currentSearchDepth})</Pre>}
						{findNode_state === "inactive" && <Pre>Locations found in maps: (depth: {findNode_currentSearchDepth})</Pre>}
						<Button ml={5} text="Stop" enabled={findNode_state === "active"} onClick={()=>this.StopSearch()}/>
						<Button ml={5} text="Close" onClick={()=>{
							runInAction("SearchResultRow.Close", ()=>{
								store.main.search.findNode_state = "inactive";
								store.main.search.findNode_node = null;
								store.main.search.findNode_resultPaths = [];
								store.main.search.findNode_currentSearchDepth = 0;
							});
						}}/>
					</Row>}
				{findNode_node === nodeID && findNode_resultPaths.length > 0 && findNode_resultPaths.map(resultPath=>{
					const mapRootNodeID = resultPath.split("/")[0];
					const mapRootNode = GetNode(mapRootNodeID);
					if (mapRootNode == null) return; // still loading
					const mapRootNode_map = GetMap(mapRootNode.rootNodeForMap);
					const inCurrentMap = mapRootNodeID == rootNodeID;
					return (
						<Row key={resultPath}>
							<Button mr="auto" text={inCurrentMap ? `Jump to ${resultPath}` : `Open containing map (${mapRootNode.rootNodeForMap})`} onClick={()=>{
								if (inCurrentMap) {
									JumpToNode(mapID, resultPath);
								} else {
									if (mapRootNode_map == null) return; // still loading
									runInAction("SearchResultRow.OpenContainingMap", ()=>{
										if (mapRootNode_map.type == MapType.Private) {
											store.main.page = "private";
											store.main.private.selectedMapID = mapRootNode_map._key;
										} else if (mapRootNode_map.type == MapType.Public) {
											store.main.page = "public";
											store.main.public.selectedMapID = mapRootNode_map._key;
										} else {
											store.main.page = "global";
										}
									});
								}
							}}/>
						</Row>
					);
				})}
			</Column>
		);
	}
}

export function JumpToNode(mapID: string, path: string) {
	runInAction("JumpToNode", ()=>{
		const pathNodeIDs = path.split("/");

		const mapView = new MapView();
		const rootNodeView = new MapNodeView();
		mapView.rootNodeViews[pathNodeIDs[0]] = rootNodeView;

		let currentParentView = rootNodeView;
		for (const childID of pathNodeIDs.Skip(1)) {
			currentParentView.expanded = true;

			const childView = new MapNodeView();
			currentParentView.children[childID] = childView;
			currentParentView = childView;
		}
		currentParentView.focused = true;
		currentParentView.viewOffset = new Vector2i(0, 0);

		ACTMapViewMerge(mapID, mapView);

		// const mapUI = FindReact(document.querySelector('.MapUI')) as MapUI;
		const mapUI = MapUI.CurrentMapUI;
		if (mapUI) {
			mapUI.StartLoadingScroll();
		}
	});
}