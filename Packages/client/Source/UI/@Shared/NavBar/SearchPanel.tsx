import {SleepAsync, Vector2, WaitXThenRun, E, ea} from "web-vcore/nm/js-vextensions.js";
import keycode from "keycode";
import moment from "web-vcore/nm/moment";
import {Button, Column, Pre, Row, TextArea, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {EB_ShowError, EB_StoreError, InfoButton, LogWarning, Observer, O, ES, RunInAction, chroma_maxDarken} from "web-vcore";
import {store} from "Store";
import {GetOpenMapID} from "Store/main";
import {ACTMapViewMerge} from "Store/main/maps/mapViews/$mapView.js";
import {runInAction, flow} from "web-vcore/nm/mobx.js";
import {Validate, GetAsync, UUID} from "web-vcore/nm/mobx-graphlink.js";
import {GetNodeRevision, MapView, NodeView, GetNode, GetAllNodeRevisionTitles, GetNodeL2, AsNodeL3, GetNodeDisplayText, GetUser, GetRootNodeID, NodeType_Info, GetMap, GetNodeLinks, GetNodeRevisions, NodeRevision, globalMapID, ChildGroup, GetSearchTerms_Advanced, NodeL2} from "dm_common";
import {GetNodeColor} from "Store/db_ext/nodes";
import {apolloClient} from "Utils/LibIntegrations/Apollo.js";
import {gql} from "web-vcore/nm/@apollo/client";
import {liveSkin} from "Utils/Styles/SkinManager";
import {MapUI} from "../Maps/MapUI.js";
import {NodeUI_Menu_Stub} from "../Maps/Node/NodeUI_Menu.js";

const columnWidths = [0.68, 0.2, 0.12];

@Observer
export class SearchPanel extends BaseComponentPlus({} as {}, {}, {} as {queryStr: string}) {
	ClearResults() {
		RunInAction("SearchPanel.ClearResults", ()=>{
			store.main.search.searchResults_partialTerms = ea;
			store.main.search.searchResults_nodeIDs = ea;
		});
	}
	async PerformSearch() {
		// first clear the old results
		this.ClearResults();

		let {queryStr} = this.stash;
		const unrestricted = queryStr.endsWith(" /unrestricted");
		if (unrestricted) {
			queryStr = queryStr.slice(0, -" /unrestricted".length);
		}

		if (Validate("UUID", queryStr) == null) {
			const nodeRevisionMatch = await GetAsync(()=>GetNodeRevision(queryStr));
			if (nodeRevisionMatch) {
				RunInAction("SearchPanel.PerformSearch_part2_nodeRevisionID", ()=>{
					//store.main.search.searchResults_nodeRevisionIDs = [nodeRevisionMatch.id];
					store.main.search.searchResults_nodeIDs = [nodeRevisionMatch.node];
				});
				return;
			}
			const node = await GetAsync(()=>GetNodeL2(queryStr));
			if (node) {
				//const visibleNodeRevision = node.current;
				RunInAction("SearchPanel.PerformSearch_part2_nodeID", ()=>{
					//store.main.search.searchResults_nodeRevisionIDs = [node.currentRevision];
					//store.main.search.searchResults_nodeRevisionIDs = [visibleNodeRevision.id];
					store.main.search.searchResults_nodeIDs = [node.id];
				});
				return;
			}
		}

		const searchTerms = GetSearchTerms_Advanced(queryStr);
		// if no whole-terms, and not unrestricted mode, cancel search (db would give too many results)
		if (searchTerms.wholeTerms.length == 0 && !unrestricted) return;
		const queryStr_withoutPartialTerms = searchTerms.wholeTerms.join(" ");

		const result = await apolloClient.query({
			query: gql`
				query($input: SearchGloballyInput!) {
					searchGlobally(input: $input) {
						nodeId
						rank
						type
						foundText
						nodeText
					}
				}
			`,
			variables: {input: {
				//query: queryStr,
				query: queryStr_withoutPartialTerms,
				// atm, limit results to the first 100 matches (temp workaround for UI becoming unresponsive for huge result-sets)
				searchLimit: 100,
			}},
		});
		const foundNodeIDs = result.data.searchGlobally.map(a=>a.nodeId);

		RunInAction("SearchPanel.PerformSearch_part2", ()=>{
			store.main.search.searchResults_partialTerms = searchTerms.partialTerms;
			store.main.search.searchResults_nodeIDs = foundNodeIDs;
		});
	}

	render() {
		const {searchResults_partialTerms} = store.main.search;
		// atm, limit results to the first 100 matches (temp workaround for UI becoming unresponsive for huge result-sets)
		const searchResultIDs = store.main.search.searchResults_nodeIDs.Take(100);

		let results_nodeL2s = searchResultIDs.map(id=>GetNodeL2(id)).filter(a=>a != null) as NodeL2[]; // filter, since search-results may be old (before an entry's deletion)

		// after finding node-revisions matching the whole-terms, filter to those that match the partial-terms as well
		// note: this narrows the results to nodes whose latest-revision still matches the partial-terms (which may be confusing, since this narrowing only happens for partial terms [edit: maybe not true, with changed postgres funcs])
		if (searchResults_partialTerms.length) {
			for (const term of searchResults_partialTerms) {
				results_nodeL2s = results_nodeL2s.filter(a=>{
					const titles = GetAllNodeRevisionTitles(a.current);
					return titles.every(b=>b.toLowerCase().includes(term));
				});
			}
		}

		const results_nodeIDs = results_nodeL2s?.filter(a=>a).map(a=>a.id).Distinct();
		const {queryStr} = store.main.search;

		this.Stash({queryStr});
		return (
			<Column style={{
				width: 750, padding: 5, borderRadius: "0 0 0 5px",
				background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
			}}>
				<Row center>
					<TextInput style={{flex: 1}} value={queryStr}
						instant // since enter-key needs value pre-blur
						onChange={val=>{
							RunInAction("SearchPanel.searchInput.onChange", ()=>store.main.search.queryStr = val);
						}}
						onKeyDown={e=>{
							if (e.keyCode == keycode.codes.enter) {
								this.PerformSearch();
							}
						}}/>
					<InfoButton ml={5} text={`
						* Terms can be excluded from the search results be adding "-" to the start. (eg: climate change -solar)
						* If you enter the exact ID of a node or node-revision, that matching entry will be shown.
						* Advanced: If match-by-stem is insufficient, wildcards can be used for basic match-by-contains, but there must be at least one non-wildcard term. (eg: climate chang*)
					`.AsMultiline(0)}/>
					<Button ml={5} text="Search" onClick={()=>this.PerformSearch()}/>
				</Row>
				{/* <Row style={{ fontSize: 18 }}>Search results ({results_nodeIDs.length})</Row> */}
				<Column mt={5} className="clickThrough" style={{height: 40, background: liveSkin.NavBarPanelBackgroundColor().darken(.1 * chroma_maxDarken).css(), borderRadius: 10}}>
					{/* <Row style={{ height: 40, padding: 10 }}>
						<Pre>Sort by: </Pre>
						<Select options={GetEntries(SortType, name => EnumNameToDisplayName(name))}
							value={sortBy} onChange={val => store.dispatch(new ACTNodeListSortBySet({ mapID: map._id, sortBy: val }))}/>
						<Row width={200} style={{ position: 'absolute', left: 'calc(50% - 100px)' }}>
							<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
								enabled={page > 0} onClick={() => {
									// store.dispatch(new ACTNodeListPageSet({mapID: map._id, page: page - 1}));
									store.dispatch(new ACTNodeListPageSet({ mapID: map._id, page: page - 1 }));
								}}/>
							<Div ml={10} mr={7}>Page: </Div>
							<TextInput mr={10} pattern="[0-9]+" style={{ width: 30 }} value={page + 1}
								onChange={(val) => {
									if (!IsNumberString(val)) return;
									store.dispatch(new ACTNodeListPageSet({ mapID: map._id, page: (parseInt(val) - 1).KeepBetween(0, lastPage) }));
								}}/>
							<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
								enabled={page < lastPage} onClick={() => {
									store.dispatch(new ACTNodeListPageSet({ mapID: map._id, page: page + 1 }));
								}}/>
							</Row>
					</Row> */}
					<Row style={{height: 40, padding: 10}}>
						<span style={{flex: columnWidths[0], fontWeight: 500, fontSize: 16}}>Title</span>
						<span style={{flex: columnWidths[1], fontWeight: 500, fontSize: 16}}>Creator</span>
						<span style={{flex: columnWidths[2], fontWeight: 500, fontSize: 16}}>Created at</span>
					</Row>
				</Column>
				<ScrollView style={ES({flex: 1})} contentStyle={{paddingTop: 10}} onContextMenu={e=>{
					if (e.nativeEvent["handled"]) return true;
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

		const upPathCompletions = [] as string[];
		let upPathAttempts = [`${targetNodeY}`];
		for (let depth = 0; depth < searchDepth; depth++) {
			const newUpPathAttempts = [] as string[];
			for (const upPath of upPathAttempts) {
				const nodeID = upPath.split("/").First();
				const node = await GetAsync(()=>GetNodeL2(nodeID));
				// const node = (yield GetAsync(() => GetNodeL2(nodeID))) as NodeL2;
				if (node == null) {
					LogWarning(`Could not find node #${nodeID}, as parent of #${upPath.split("/").XFromLast(1)}.`);
					continue;
				}

				if (node.rootNodeForMap != null) {
					upPathCompletions.push(upPath);
					// continue; // commented; node may be a map-root, and still have parents
				}

				//const parentIDs = (node.parents || {}).Pairs().map(a=>a.key);
				//const parentIDs = GetNodeLinks(null, node.id).map(a=>a.parent);
				const parentLinks = await GetAsync(()=>GetNodeLinks(null, node.id));
				const parentIDs = parentLinks.map(a=>a.parent);
				for (const parentID of parentIDs) {
					const newUpPath = `${parentID}/${upPath}`;
					newUpPathAttempts.push(newUpPath);
				}
			}
			upPathAttempts = newUpPathAttempts;

			// if (depth === 0 || upPathCompletions.length !== State(a => a.main.search.findNode_resultPaths).length) {
			RunInAction("SearchResultRow.StartFindingPathsFromXToY_inLoop", ()=>{
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
		RunInAction("SearchResultRow.StopSearch", ()=>store.main.search.findNode_state = "inactive");
	}

	componentDidCatch(message, info) { EB_StoreError(this as any, message, info); }
	// searchInProgress = false;
	static searchInProgress = false;
	render() {
		if (this.state["error"]) return EB_ShowError(this.state["error"]);
		const {nodeID, index} = this.props;
		const node = GetNodeL2(nodeID);
		const creator = node ? GetUser(node.creator) : null;

		const openMapID = GetOpenMapID();
		const openMap = GetMap(openMapID);
		const openMap_rootNodeID = openMapID ? GetRootNodeID(openMapID) : null;

		const {findNode_state} = store.main.search;
		const {findNode_node} = store.main.search;
		if (findNode_state === "activating" && findNode_node == nodeID && !SearchResultRow.searchInProgress) {
			SearchResultRow.searchInProgress = true;
			WaitXThenRun(0, ()=>{
				RunInAction("SearchResultRow.call_StartFindingPathsFromXToY_pre", ()=>store.main.search.findNode_state = "active");
				this.StartFindingPathsFromRootsToX(nodeID).then(()=>SearchResultRow.searchInProgress = false);
			});
		}
		const {findNode_resultPaths} = store.main.search;
		const {findNode_currentSearchDepth} = store.main.search;

		// if (node == null) return <Row>Loading... (#{nodeID})</Row>;
		if (node == null) return <Row></Row>;

		const nodeL3 = AsNodeL3(node, null);
		const path = `${node.id}`;

		const backgroundColor = GetNodeColor(nodeL3)/*.desaturate(0.5)*/.alpha(0.8);
		const nodeTypeInfo = NodeType_Info.for[node.type];

		return (
			<Column>
				<Row mt={index === 0 ? 0 : 5} className="useLightText cursorSet"
					style={E(
						{
							padding: 5, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)",
							color: liveSkin.NodeTextColor(),
						},
						// selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
					)}
					onMouseDown={e=>{
						if (e.button !== 2) return false;
						this.SetState({menuOpened: true});
					}}>
					<span style={{flex: columnWidths[0]}}>{GetNodeDisplayText(node, path)}</span>
					<span style={{flex: columnWidths[1]}}>{creator ? creator.displayName : "..."}</span>
					<span style={{flex: columnWidths[2]}}>{moment(node.createdAt).format("YYYY-MM-DD")}</span>
					{/* <NodeUI_Menu_Helper {...{map, node}}/> */}
					<NodeUI_Menu_Stub {...{node: nodeL3, path: `${node.id}`, inList: true}} childGroup={ChildGroup.generic}/>
				</Row>
				{findNode_node === nodeID &&
					<Row>
						{findNode_state === "active" && <Pre>Finding in map... (depth: {findNode_currentSearchDepth})</Pre>}
						{findNode_state === "inactive" && <Pre>Locations found in maps: (depth: {findNode_currentSearchDepth})</Pre>}
						<Button ml={5} text="Stop" enabled={findNode_state === "active"} onClick={()=>this.StopSearch()}/>
						<Button ml={5} text="Close" onClick={()=>{
							RunInAction("SearchResultRow.Close", ()=>{
								store.main.search.findNode_state = "inactive";
								store.main.search.findNode_node = null;
								store.main.search.findNode_resultPaths = [];
								store.main.search.findNode_currentSearchDepth = 0;
							});
						}}/>
					</Row>}
				{findNode_node === nodeID && findNode_resultPaths.length > 0 && findNode_resultPaths.map(resultPath=>{
					const resultPath_nodeIDs = resultPath.split("/");
					const resultPath_nodes = resultPath_nodeIDs.map(id=>GetNodeL2(id));
					const result_map = GetMap(resultPath_nodes[0]?.rootNodeForMap);
					const inCurrentMap = openMap && resultPath_nodeIDs[0] == openMap_rootNodeID;

					const resultPath_nodeTitles = resultPath_nodes.map(a=>(a ? GetNodeDisplayText(a) : "..."));
					const resultPath_str = resultPath_nodeTitles.map(a=>{
						return `"${a.slice(0, 20)}${a.length > 20 ? "..." : ""}"`;
					}).join(" -> ");

					return (
						<Row key={resultPath}>
							<Button mr="auto" text={inCurrentMap ? `Jump to ${resultPath_str}` : `Open containing map (${result_map?.name ?? "n/a"})`} onClick={()=>{
								if (inCurrentMap) {
									JumpToNode(openMapID!, resultPath);
								} else {
									if (result_map == null) return; // still loading
									RunInAction("SearchResultRow.OpenContainingMap", ()=>{
										if (result_map.id == globalMapID) {
											store.main.page = "global";
										} else {
											store.main.page = "debates";
											store.main.debates.selectedMapID = result_map.id;
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
	RunInAction("JumpToNode", ()=>{
		const pathNodeIDs = path.split("/");

		// "new Map[Node]View()" causes unwanted fields attached (now that "useDefineForClassFields:true" is enabled), so create empty object isntead
		//const mapView = new MapView();
		const mapView = {rootNodeViews: {}} as MapView;
		//const rootNodeView = new NodeView(path);
		const rootNodeView = {children: {}} as NodeView;
		mapView.rootNodeViews[pathNodeIDs[0]] = rootNodeView;

		let currentParentView = rootNodeView;
		for (const [i, descendantID] of pathNodeIDs.entries()) {
			if (i == 0) continue;
			const descendantPath = pathNodeIDs.Take(i + 1).join("/");
			currentParentView.expanded = true;
			// for now, just make all children in the set visible (we don't yet have an easy to locate the node in the target path)
			currentParentView.childLimit_down = 500;
			currentParentView.childLimit_up = 500;

			//const childView = new NodeView(descendantPath);
			const childView = {children: {}} as NodeView;
			currentParentView.children ??= {};
			currentParentView.children[descendantID] = childView;
			currentParentView = childView;
		}
		currentParentView.viewAnchor = true;
		currentParentView.viewOffset = new Vector2(0, 0);

		ACTMapViewMerge(mapID, mapView);
		//ACTMapViewMerge(mapID, mapView, false, false);

		// const mapUI = FindReact(document.querySelector('.MapUI')) as MapUI;
		const mapUI = MapUI.CurrentMapUI;
		if (mapUI) {
			mapUI.StartLoadingScroll();
		}
	});
}