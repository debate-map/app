import {BaseComponentWithConnector, BaseComponent, GetInnerComp, RenderSource, FindDOM} from "react-vextensions";
import { Connect } from "Frame/Database/FirebaseConnect";
import {Column, Row, Button, Div} from "react-vcomponents";
import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import NodeConnectorBackground from "UI/@Shared/Maps/MapNode/NodeConnectorBackground";
import { NodeUI } from "UI/@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import { MapNodeView } from "Store/main/mapViews/@MapViews";
import { MapNodeType } from "Store/firebase/nodes/@MapNodeType";
import {Vector2i} from "js-vextensions";
import {ArgumentsControlBar} from "../ArgumentsControlBar";
import {Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import { ACTMapNodeChildLimitSet } from "Store/main/mapViews/$mapView/rootNodeViews";
import Icon from "Frame/ReactComponents/Icon";

export type ChildPack = {origIndex: number, node: MapNodeL3};

/*export class ChildPackUI extends BaseComponent
		<{
			map: Map, path: string, childrenWidthOverride: number, showAll: boolean, childLimit_up: number, childLimit_down: number,
			pack: ChildPack, index: number, collection: ChildPack[], direction?: "up" | "down",
		}, {}> {
	static defaultProps = {direction: "down"};
	render() {
		let {map, path, childrenWidthOverride, childLimit_up, childLimit_down, showAll, pack, index, direction} = this.props;
		/*if (pack.node.premiseAddHelper) {
			return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
		}*#/

		let childLimit = direction == "down" ? childLimit_down : childLimit_up;
		return (
			<NodeUI key={pack.node._id} map={map} node={pack.node}
					path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
				{index == (direction == "down" ? childLimit - 1 : 0) && !showAll && (collection.length > childLimit || childLimit != initialChildLimit) &&
					<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection.length}/>}
			</NodeUI>
		);
	}
}*/

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, childPacks: ChildPack[],
	separateChildren: boolean, showArgumentsControlBar: boolean, linkSpawnPoint: number, onChildrenCenterYChange?: (childrenCenterY: number)=>void,
};
let initialState = {
	childrenWidthOverride: null as number,
	oldChildBoxOffsets: null as {[key: number]: Vector2i},
};

let connector = (state, {}: Props)=> {
	return {
		initialChildLimit: State(a=>a.main.initialChildLimit),
	};
};
@Connect(connector)
export class NodeChildHolder extends BaseComponentWithConnector(connector, initialState) {
	childBoxes: {[key: number]: NodeUI} = {};
	render() {
		let {map, node, nodeView, path, childPacks, separateChildren, showArgumentsControlBar, linkSpawnPoint, onChildrenCenterYChange, initialChildLimit} = this.props;
		let {childrenWidthOverride, oldChildBoxOffsets} = this.state;

		let upChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalPolarity == Polarity.Supporting) : [];
		let downChildPacks = separateChildren ? childPacks.filter(a=>a.node.finalPolarity == Polarity.Opposing) : [];

		let childLimit_up = ((nodeView || {}).childLimit_up || initialChildLimit).KeepAtLeast(initialChildLimit);
		let childLimit_down = ((nodeView || {}).childLimit_down || initialChildLimit).KeepAtLeast(initialChildLimit);
		// if the map's root node, or an argument node, show all children
		let showAll = node._id == map.rootNode || node.type == MapNodeType.Argument;
		if (showAll) [childLimit_up, childLimit_down] = [100, 100];

		let RenderChildPack = (pack: ChildPack, index: number, collection, direction = "down" as "up" | "down")=> {
			/*if (pack.node.premiseAddHelper) {
				return <PremiseAddHelper mapID={map._id} parentNode={node} parentPath={path}/>;
			}*/

			let childLimit = direction == "down" ? childLimit_down : childLimit_up;
			return (
				<NodeUI key={pack.node._id} ref={c=>this.childBoxes[pack.node._id] = GetInnerComp(c)} map={map} node={pack.node}
						path={path + "/" + pack.node._id} widthOverride={childrenWidthOverride} onHeightOrPosChange={this.OnChildHeightOrPosChange}>
					{index == (direction == "down" ? childLimit - 1 : 0) && !showAll && (collection.length > childLimit || childLimit != initialChildLimit) &&
						<ChildLimitBar {...{map, path, childrenWidthOverride, childLimit}} direction={direction} childCount={collection.length}/>}
				</NodeUI>
			);
		}

		this.childBoxes = {};
		return (
			<Column ref={c=>this.childHolder = c} className="childHolder clickThrough" style={E(
				{
					marginLeft: childPacks.length || showArgumentsControlBar ? 30 : 0,
					//display: "flex", flexDirection: "column", marginLeft: 10, maxHeight: expanded ? 500 : 0, transition: "max-height 1s", overflow: "hidden",
				},
				//!expanded && {visibility: "hidden", height: 0}, // maybe temp; fix for lines-sticking-to-top issue
			)}>
				{linkSpawnPoint && oldChildBoxOffsets &&
					<NodeConnectorBackground node={node} linkSpawnPoint={linkSpawnPoint} shouldUpdate={true} //this.lastRender_source == RenderSource.SetState}
						childPacks={childPacks} childBoxOffsets={oldChildBoxOffsets}/>}
				
				{!separateChildren && childPacks.slice(0, childLimit_down).map((pack, index)=> {
					return RenderChildPack(pack, index, childPacks);
				})}
				{separateChildren &&
					<Column ref={c=>this.upChildHolder = c} ct className="upChildHolder">
						{upChildPacks.slice(-childLimit_up).map((pack, index)=> {
							return RenderChildPack(pack, index, upChildPacks, "up");
						})}
					</Column>}
				{showArgumentsControlBar &&
					<ArgumentsControlBar ref={c=>this.argumentsControlBar = c} map={map} parentNode={node} parentPath={path} node={node}/>}
				{separateChildren &&
					<Column ref={c=>this.downChildHolder = c} ct>
						{downChildPacks.slice(0, childLimit_down).map((pack, index)=> {
							return RenderChildPack(pack, index, downChildPacks, "down");
						})}
					</Column>}
			</Column>
		);
	}
	childHolder: Column;
	upChildHolder: Column;
	downChildHolder: Column;
	argumentsControlBar: ArgumentsControlBar;

	lastHeight = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = $(FindDOM(this)).outerHeight();
		if (height != this.lastHeight) {
			this.OnHeightChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
	}
	
	OnChildHeightOrPosChange_updateStateQueued = false;
	OnChildHeightOrPosChange() {
		let {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnChildHeightOrPosChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}\ncenterY:${this.GetChildrenCenterY()}`)

		//this.OnHeightOrPosChange();
		// wait one frame, so that if multiple calls to this method occur in the same frame, we only have to call OnHeightOrPosChange() once
		if (!this.OnChildHeightOrPosChange_updateStateQueued) {
			this.OnChildHeightOrPosChange_updateStateQueued = true;
			requestAnimationFrame(()=> {
				if (!this.mounted) return;
				this.UpdateState();
				this.OnChildHeightOrPosChange_updateStateQueued = false;
			});
		}
	}

	GetChildrenCenterY() {
		if (this.argumentsControlBar) {
			//return upChildHolder.css("display") != "none" ? upChildHolder.outerHeight() : 0;
			return this.upChildHolder.DOM.style.visibility != "hidden" ? $(this.argumentsControlBar.DOM).GetScreenRect().Center.y - $(this.childHolder.DOM).GetScreenRect().y : 0
		}
		//return childHolder.css("display") != "none" ? childHolder.outerHeight() / 2 : 0,
		return this.childHolder.DOM.style.visibility != "hidden" ? $(this.childHolder.DOM).GetScreenRect().height / 2 : 0;
	}
	ReportChildrenCenterYChange() {
		let {node, onChildrenCenterYChange} = this.props;

		let childrenCenterY = this.GetChildrenCenterY();

		if (onChildrenCenterYChange) onChildrenCenterYChange(childrenCenterY);

		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnChildrenCenterYChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.GetChildrenCenterY()}`);
	}

	OnHeightChange() {
		let {node} = this.props;
		MaybeLog(a=>a.nodeRenderDetails && (a.nodeRenderDetails_for == null || a.nodeRenderDetails_for == node._id),
			()=>`OnHeightChange NodeUI (${RenderSource[this.lastRender_source]}):${this.props.node._id}${nl
				}centerY:${this.GetChildrenCenterY()}`);
		
		//this.UpdateState(true);
		this.UpdateState();
		this.ReportChildrenCenterYChange();
	}
	UpdateState(forceUpdate = false) {
		let {map, node, path, children, nodeView, linkSpawnPoint} = this.props;
		let expanded = nodeView && nodeView.expanded;
		let childHolder = $(this);
		let upChildHolder = childHolder.children(".upChildHolder");
		let downChildHolder = childHolder.children(".downChildHolder");
		let argumentsControlBar = childHolder.children(".argumentsControlBar");
		/*let firstChild = (upChildHolder.length ? upChildHolder : childHolder).children().ToList()[0];
		let lastChild = (downChildHolder.length ? downChildHolder : childHolder).children().ToList().Last();*/

		// if children are supposed to show, but are not rendered yet, do not call set-state (yet)
		/*if (expanded) {
			if (upChildHolder.length) {
				if (upChildHolder.css("display") == "none") return;
			} else {
				if (childHolder.css("display") == "none") return;
			}
		}*/

		let childBoxes = this.childBoxes.VValues().filter(a=>a != null);
		let newState = E(
			expanded &&
				{childrenWidthOverride: childBoxes.map(comp=>comp.GetMeasurementInfo().width).concat(0).Max(null, true)},
		) as any; //as State;

		let showAddArgumentButtons = false; //node.type == MapNodeType.Claim && expanded && nodeChildren != emptyArray_forLoading; // && nodeChildren.length > 0;
		//if (this.lastRender_source == RenderSource.SetState && this.refs.childHolder) {
		if (expanded && this.childHolder) {
			let holderOffset = new Vector2i($(FindDOM(this.childHolder)).offset());

			let oldChildBoxOffsets = this.childBoxes.Props().Where(pair=>pair.value != null).ToMap(pair=>pair.name, pair=> {
				//let childBox = FindDOM_(pair.value).find("> div:first-child > div"); // get inner-box of child
				//let childBox = $(FindDOM(pair.value)).find(".NodeUI_Inner").first(); // get inner-box of child
				let childBox = $(pair.value.innerUI.DOM);
				Assert(childBox.length, "Could not find inner-ui of child-box.");
				let childBoxOffset = new Vector2i(childBox.offset()).Minus(holderOffset);
				Assert(childBoxOffset.x < 100, "Something is wrong. X-offset should never be more than 100.");
				childBoxOffset = childBoxOffset.Plus(new Vector2i(0, childBox.outerHeight() / 2));
				return childBoxOffset;
			});
			newState.oldChildBoxOffsets = oldChildBoxOffsets;
		}
		
		let cancelIfStateSame = !forceUpdate;
		var changedState = this.SetState(newState, null, cancelIfStateSame, true);
		//Log(`Changed state? (${this.props.node._id}): ` + changedState);
	}
}

@Connect((state, props)=> ({
	initialChildLimit: State(a=>a.main.initialChildLimit),
}))
export class ChildLimitBar extends BaseComponent
		<{map: Map, path: string, childrenWidthOverride: number, direction: "up" | "down", childCount: number, childLimit: number}
			& Partial<{initialChildLimit: number}>,
		{}> {
	static HEIGHT = 36;
	render() {
		let {map, path, childrenWidthOverride, direction, childCount, childLimit, initialChildLimit} = this.props;
		return (
			<Row style={{
				//position: "absolute", marginTop: -30,
				[direction == "up" ? "marginBottom" : "marginTop"]: 10, width: childrenWidthOverride, cursor: "default",
			}}>
				<Button text={
					<Row>
						<Icon icon={`arrow-${direction}`} size={15}/>
						<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>
					</Row>
				} title="Show more"
				enabled={childLimit < childCount} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit + 3).KeepAtMost(childCount)}));
				}}/>
				<Button ml={5} text={
					<Row>
						<Icon icon={`arrow-${direction == "up" ? "down" : "up"}`} size={15}/>
						{/*<Div ml={3}>{childCount > childLimit ? childCount - childLimit : null}</Div>*/}
					</Row>
				} title="Show less"
				enabled={childLimit > initialChildLimit} style={{flex: 1}} onClick={()=> {
					store.dispatch(new ACTMapNodeChildLimitSet({mapID: map._id, path, direction, value: (childLimit - 3).KeepAtLeast(initialChildLimit)}));
				}}/>
			</Row>
		);
	}
}