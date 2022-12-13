// This file is very old, and left here for now for reference purposes. Will need review if restored in the future.

/* const columnWidths = [0.68, 0.2, 0.12];

const entriesPerPage = 23;

type Props = {map: Map};
export class ListUI extends BaseComponent<Props, {panelToShow?: string}> {
	render() {
		const { map } = this.props;
		const mapInfo = store.main.mapStates.get(map.id);
		const selectedNodeL1 = GetNode(mapInfo.list_selectedNodeID);
		const selectedNode = selectedNodeL1 && GetNodeL3(selectedNodeL1.id);
		let page = mapInfo.list_page;
		// nodes: GetNodes({limitToFirst: entriesPerPage * (page + 1)}).Skip(page * entriesPerPage).Take(entriesPerPage),
		let nodes = GetNodesL2();
		nodes = nodes.Any((a) => a == null) ? emptyArray : nodes; // only pass nodes when all are loaded

		const sortBy = mapInfo.list_sortBy;
		const filter = mapInfo.list_filter;

		const nodesSorted = nodes.OrderBy((node) => {
			if (sortBy == SortType.CreatorID) return node.creator;
			if (sortBy == SortType.CreationDate) return node.createdAt;
			// if (sortBy == SortType.UpdateDate) return node.;
			// if (sortBy == SortType.ViewerCount) return node.;
			// Assert(false);
		});

		let nodesFiltered = nodesSorted;
		if (filter.length) {
			let regExp;
			if (filter.startsWith('/') && filter.endsWith('/')) {
				try {
					regExp = new RegExp(filter.slice(1, -1), 'i');
				} catch (ex) {}
			}
			nodesFiltered = nodesFiltered.filter((node) => {
				const titles = node.current.titles ? node.current.titles.ExcludeKeys('allTerms').VValues(true) as string[] : [];
				if (regExp) {
					return titles.find((a) => a.match(regExp) != null);
				}
				const terms = filter.toLowerCase().split(' ');
				return titles.find((a) => terms.every((term) => a.toLowerCase().includes(term)));
			});
		}

		const pageCount = Math.ceil(nodesFiltered.length / entriesPerPage);
		const lastPage = Math.max(0, pageCount - 1);
		page = Math.min(page, lastPage);
		const nodesForPage = nodesFiltered.Skip(page * entriesPerPage).Take(entriesPerPage);

		return (
			<Row style={ES({ flex: 1, alignItems: 'flex-start' })} onClick={(e) => {
				if (e.target != e.currentTarget) return;
				mapInfo.list_selectedNodeID = null;
			}}>
				<Column className="clickThrough" ml={10} mt={10} mb={10}
					style={{
						// position: "relative", flex: .5, height: "calc(100% - 20px)",
						position: 'absolute', left: 0, right: '50%', height: 'calc(100% - 20px)', // fix for safari
						borderRadius: 10, filter: 'drop-shadow(0px 0px 10px rgba(0,0,0,1))',
					}}>
					<Column className="clickThrough" style={{ height: 80, background: 'rgba(0,0,0,.7)', borderRadius: 10 }}>
						<Row style={{ height: 40, padding: 10 }}>
							<Pre>Sort by: </Pre>
							<Select options={GetEntries(SortType, (name) => EnumNameToDisplayName(name))}
								value={sortBy} onChange={(val) => mapInfo.list_sortBy = val}/>
							<Row style={{ position: 'absolute', left: 'calc(50% - 100px)' /* width: 200 *#/ }}>
								<Button text={<Icon icon="arrow-left" size={15}/>} title="Previous page"
									enabled={page > 0} onClick={() => {
										mapInfo.list_page = page - 1;
									}}/>
								<Div ml={10} mr={7}>Page: </Div>
								<TextInput mr={10} pattern="[0-9]+" style={{ width: 30 }} value={`${page + 1}`}
									onChange={(val) => {
										if (!IsNumberString(val)) return;
										mapInfo.list_page = (parseInt(val) - 1).KeepBetween(0, lastPage);

									}}/>
								<Button text={<Icon icon="arrow-right" size={15}/>} title="Next page"
									enabled={page < lastPage} onClick={() => {
										mapInfo.list_page = page + 1;
									}}/>
							</Row>
							<Div mlr="auto"/>
							<Pre>Filter:</Pre>
							<InfoButton text="Hides nodes without the given text. Regular expressions can be used, ex: /there are [0-9]+ dimensions/"/>
							<TextInput ml={2} value={filter} onChange={(val) => mapInfo.list_filter = val}/>
						</Row>
						<Row style={{ height: 40, padding: 10 }}>
							<span style={{ flex: columnWidths[0], fontWeight: 500, fontSize: 17 }}>Title</span>
							<span style={{ flex: columnWidths[1], fontWeight: 500, fontSize: 17 }}>Creator</span>
							<span style={{ flex: columnWidths[2], fontWeight: 500, fontSize: 17 }}>Creation date</span>
						</Row>
					</Column>
					<ScrollView style={ES({ flex: 1 })} contentStyle={{ paddingTop: 10 }} onClick={(e) => {
						if (e.target != e.currentTarget) return;
						mapInfo.list_selectedNodeID = null;
					}}
					onContextMenu={(e) => {
						if (e.nativeEvent['handled']) return true;
						e.preventDefault();
					}}>
						{nodes.length == 0 && <div style={{ textAlign: 'center', fontSize: 18 }}>Loading...</div>}
						{nodesForPage.map((node, index) => {
							return <NodeRow key={node.id} map={map} node={node} first={index == 0}/>;
						})}
					</ScrollView>
				</Column>
				<Column style={{
					// flex: .5,
					position: 'absolute', left: '50%', right: 0, height: '100%', // fix for safari
				}}>
					{selectedNode == null && <div style={{ padding: 10, textAlign: 'center' }}>No node selected.</div>}
					{selectedNode && <NodeColumn map={map} node={selectedNode}/>}
				</Column>
			</Row>
		);
	}
}

type NodeRow_Props = {map: Map, node: NodeL2, first: boolean};
class NodeRow extends BaseComponentPlus({} as NodeRow_Props, { menuOpened: false }) {
	render() {
		const { map, node, first } = this.props;
		const { menuOpened } = this.state;

		const creator = GetUser(node.creator);
		const mapInfo = store.main.mapStates.get(map.id);
		const selected = GetNode(mapInfo.list_selectedNodeID);

		const nodeL3 = AsNodeL3(node);
		const path = `${node.id}`;

		const backgroundColor = GetNodeColor(nodeL3).desaturate(0.5).alpha(0.8);
		const nodeTypeInfo = NodeType_Info.for[node.type];

		return (
			<Row mt={first ? 0 : 5} className="cursorSet"
				style={E(
					{ padding: 5, background: backgroundColor.css(), borderRadius: 5, cursor: 'pointer', border: '1px solid rgba(0,0,0,.5)' },
					selected && { background: backgroundColor.brighten(0.3).alpha(1).css() },
				)}
				onClick={(e) => {
					mapInfo.list_selectedNodeID = node.id;
				}}
				onMouseDown={(e) => {
					if (e.button != 2) return false;
					this.SetState({ menuOpened: true });
				}}>
				<span style={{ flex: columnWidths[0] }}>{GetNodeDisplayText(node, path)}</span>
				<span style={{ flex: columnWidths[1] }}>{creator ? creator.displayName : '...'}</span>
				<span style={{ flex: columnWidths[2] }}>{Moment(node.createdAt).format('YYYY-MM-DD')}</span>
				{/* <NodeUI_Menu_Helper {...{map, node}}/> *#/}
				{menuOpened && <NodeUI_Menu {...{ map, node: nodeL3, path: `${node.id}`, inList: true }}/>}
			</Row>
		);
	}
}

/* @Connect((state, {map, node}: NodeRow_Props)=> ({
	nodeEnhanced: GetNodeL3(node._id),
}))
class NodeUI_Menu_Helper extends BaseComponent<{map: Map, node: NodeL1, nodeEnhanced: NodeL2}, {}> {
	render() {
		let {map, node} = this.props;
		return (
			<NodeUI_Menu_Helper {...{map, node}}/>
		);
	}
} *#/

type NodeColumn_Props = {map: Map, node: NodeL2};
class NodeColumn extends BaseComponentPlus({} as NodeColumn_Props, { width: null as number, hoverPanel: null as string }) {
	render() {
		const { map, node } = this.props;
		const { width, hoverPanel } = this.state;

		const ratingsRoot = GetNodeRatingsRoot(node.id);
		const mapInfo = store.main.mapStates.get(map.id);
		const openPanel = mapInfo.list_selectedNode_openPanel;

		const nodeL3 = AsNodeL3(node);
		const path = `${node.id}`;
		const nodeTypeInfo = NodeType_Info.for[node.type];
		const backgroundColor = GetNodeColor(nodeL3);
		const nodeView = new NodeView();
		nodeView.openPanel = openPanel;

		let panelToShow = hoverPanel || openPanel;
		// if we're supposed to show a rating panel, but its rating-type is not applicable for this node-type, fall back to main rating-type
		if (ratingTypes.Contains(panelToShow) && !GetRatingTypesForNode(node).Any((a) => a.type == panelToShow)) {
			panelToShow = GetMainRatingType(node);
		}

		return (
			<Row className="clickThrough"
				style={{
					height: '100%', padding: 10, alignItems: 'flex-start', position: 'relative',
					filter: 'drop-shadow(0px 0px 10px rgba(0,0,0,1))', /* background: "rgba(0,0,0,.5)", borderRadius: 10 *#/
				}}>
				{/* <ResizeSensor ref={()=> {
					if (this.refs.ratingsPanel) GetInnerComp(this.refs.ratingsPanel).Update();
				}} onResize={()=> {
					if (this.refs.ratingsPanel) GetInnerComp(this.refs.ratingsPanel).Update();
				}}/> *#/}
				<NodeUI_LeftBox {...{ map, path, node: nodeL3, ratingsRoot, backgroundColor }}
					onPanelButtonHover={(panel) => this.SetState({ hoverPanel: panel })}
					onPanelButtonClick={(panel) => mapInfo.list_selectedNode_openPanel = panel}
					asHover={false} inList={true} style={{ marginTop: 25 }}/>
				<ScrollView style={ES({ flex: 1 })} contentStyle={ES({ flex: 1 })}>
					<Column ml={10} style={ES({ flex: 1 })}>
						{panelToShow &&
							<div style={{ position: 'relative', padding: 5, background: 'rgba(0,0,0,.7)', borderRadius: 5, boxShadow: 'rgba(0,0,0,1) 0px 0px 2px' }}>
								<div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: backgroundColor.css() }}/>
								{ratingTypes.Contains(panelToShow) && (() => {
									const ratings = GetRatings(node.id, panelToShow as RatingType);
									return <RatingsPanel ref="ratingsPanel" node={nodeL3} path={path} ratingType={panelToShow as RatingType} ratings={ratings}/>;
								})()}
								{panelToShow == 'definitions' &&
									<DefinitionsPanel {...{ node, path, hoverTermID: null }} openTermID={null}
										/* onHoverTerm={termID=>this.SetState({hoverTermID: termID})} onClickTerm={termID=>this.SetState({clickTermID: termID})} *#//>}
								{panelToShow == 'discussion' && <DiscussionPanel/>}
								{panelToShow == 'social' && <SocialPanel/>}
								{panelToShow == 'tags' && <TagsPanel/>}
								{panelToShow == 'details' && <DetailsPanel node={nodeL3} path={path}/>}
								{panelToShow == 'history' && <HistoryPanel node={nodeL3} path={path}/>}
								{panelToShow == 'others' && <OthersPanel node={nodeL3} path={path}/>}
							</div>}
					</Column>
				</ScrollView>
			</Row>
		);
	}
} */