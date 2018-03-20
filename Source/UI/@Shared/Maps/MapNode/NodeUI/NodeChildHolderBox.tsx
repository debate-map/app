import {BaseComponentWithConnector, BaseComponent, GetInnerComp, RenderSource, FindDOM, ShallowEquals} from "react-vextensions";
import { Connect } from "Frame/Database/FirebaseConnect";
import {Column, Row, Button} from "react-vcomponents";
import { MapNodeL3 } from "Store/firebase/nodes/@MapNode";
import NodeConnectorBackground from "UI/@Shared/Maps/MapNode/NodeConnectorBackground";
import { NodeUI } from "UI/@Shared/Maps/MapNode/NodeUI";
import {Map} from "../../../../../Store/firebase/maps/@Map";
import { MapNodeView } from "Store/main/mapViews/@MapViews";
import { MapNodeType } from "Store/firebase/nodes/@MapNodeType";
import {Vector2i} from "js-vextensions";
import {ArgumentsControlBar} from "../ArgumentsControlBar";
import {Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import chroma from "chroma-js";
import {ChildLimitBar, NodeChildHolder, ChildPack} from "./NodeChildHolder";
import { emptyArray_forLoading } from "Frame/Store/ReducerUtils";

type Props = {
	map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], childPacks: ChildPack[],
	text: string, backgroundColor: Color, colorFillPercent: number, expanded: boolean
};
class HolderTemplate extends BaseComponent<Props, {innerBoxOffset: number}> {
	render() {
		let {map, node, path, nodeView, nodeChildren, childPacks,
			text, backgroundColor, colorFillPercent, expanded} = this.props;
		let {innerBoxOffset} = this.state;

		let separateChildren = node.type == MapNodeType.Claim;
		let showArgumentsControlBar = node.type == MapNodeType.Claim && expanded && nodeChildren != emptyArray_forLoading;

		let {expectedBoxWidth, boxWidth, expectedHeight} = this.GetMeasurementInfo();
		
		return (
			<div style={E({
				display: "flex", alignSelf: "flex-end", position: "relative", borderRadius: 5, cursor: "default",
				boxShadow: "rgba(0,0,0,1) 0px 0px 2px", width: 175,
			})}>
				<Row style={{alignItems: "stretch", width: "100%", borderRadius: 5, cursor: "pointer"}}>
					<div style={{position: "relative", width: "calc(100% - 17px)", padding: "5px 5px 4px"}}>
						<div style={{
							position: "absolute", left: 0, top: 0, bottom: 0,
							width: colorFillPercent + "%", background: backgroundColor.css(), borderRadius: "5px 0 0 5px",
						}}/>
						<div style={{
							position: "absolute", right: 0, top: 0, bottom: 0,
							width: (100 - colorFillPercent) + "%", background: `rgba(0,0,0,.7)`,
						}}/>
						{/*mainRating_mine != null &&
							<div style={{
								position: "absolute", left: mainRating_myFillPercent + "%", top: 0, bottom: 0,
								width: 2, background: "rgba(0,255,0,.5)",
							}}/>*/}
						<span style={{position: "relative"}}>{text}</span>
					</div>
					<Button text={expanded ? "-" : "+"} //size={28}
							style={{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 17, //minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
								padding: 0,
								fontSize: expanded ? 23 : 17,
								lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: backgroundColor.Mix("black", .2).alpha(.9).css(),
								border: "none",
								":hover": {backgroundColor: backgroundColor.Mix("black", .1).alpha(.9).css()},
							}}
							/*onClick={e=> {
								store.dispatch(new ACTMapNodeExpandedSet({mapID: map._id, path, expanded: !expanded, recursive: expanded && e.altKey}));
								e.nativeEvent.ignore = true; // for some reason, "return false" isn't working
								//return false;
							}}*//>
				</Row>
				<NodeChildHolder {...{map, node, path, nodeView, nodeChildren, childPacks, separateChildren, showArgumentsControlBar}}
					linkSpawnPoint={innerBoxOffset}
					onChildrenCenterYChange={childrenCenterY=> {
						let distFromInnerBoxTopToMainBoxCenter = expectedHeight / 2;
						let innerBoxOffset = (childrenCenterY - distFromInnerBoxTopToMainBoxCenter).KeepAtLeast(0);
						this.SetState({innerBoxOffset});
					}}/>
			</div>
		);
	}
	
	GetMeasurementInfo() {
		return {expectedBoxWidth: 175, boxWidth: 175, expectedHeight: 26};
	}

	/*lastHeight = 0;
	lastPos = 0;
	PostRender() {
		//if (this.lastRender_source == RenderSource.SetState) return;

		let height = $(FindDOM(this)).outerHeight();
		let pos = this.state.childrenCenterY|0;
		if (height != this.lastHeight) {
			this.OnHeightChange();
		} else if (pos != this.lastPos) {
			this.OnPosChange();
		} else {
			if (this.lastRender_source == RenderSource.SetState) return;
			this.UpdateState();
		}
		this.lastHeight = height;
		this.lastPos = pos;
	}*/
}

export class TruthHolder extends BaseComponent
		<{map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], childPacks: ChildPack[]}, {}> {
	render() {
		let {map, node, path, nodeView, nodeChildren, childPacks} = this.props;
		let backgroundColor = chroma(`rgb(40,60,80)`) as Color;
		let mainRating_fillPercent = 100;
		return (
			<HolderTemplate {...{map, node, path, nodeView, nodeChildren, childPacks}}
				text="Is this claim true?" expanded={true} backgroundColor={backgroundColor} colorFillPercent={mainRating_fillPercent}/>
		);
	}
}
export class RelevanceHolder extends BaseComponent
		<{map: Map, node: MapNodeL3, path: string, nodeView: MapNodeView, nodeChildren: MapNodeL3[], childPacks: ChildPack[]}, {}> {
	render() {
		let {map, node, path, nodeView, nodeChildren, childPacks} = this.props;
		let backgroundColor = chroma(`rgb(40,60,80)`) as Color;
		let mainRating_fillPercent = 100;
		return (
			<HolderTemplate {...{map, node, path, nodeView, nodeChildren, childPacks}}
				text="Is this claim relevant?" expanded={true} backgroundColor={backgroundColor} colorFillPercent={mainRating_fillPercent}/>
		);
	}
}