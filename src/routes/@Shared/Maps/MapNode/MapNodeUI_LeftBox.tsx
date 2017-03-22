import {BaseComponent, Span} from "../../../../Frame/UI/ReactGlobals";
import {MapNode} from "./MapNode";
import {MapNodeView, ACTMapNodePanelOpen} from "../../../../store/Store/Main/MapViews";
import {Map} from "../Map";
import MapNodeUI_Inner from "./MapNodeUI_Inner";
import Button from "../../../../Frame/ReactComponents/Button";
import {E} from "../../../../Frame/General/Globals_Free";

export default class MapNodeUI_LeftBox extends BaseComponent<
		{parent: MapNodeUI_Inner, map: Map, path: string, node: MapNode, nodeView?: MapNodeView, backgroundColor: string, asHover: boolean},
		{}> {
	render() {
		let {map, path, node, nodeView, backgroundColor, asHover} = this.props;
		return (
			<div style={{
				display: "flex", flexDirection: "column", position: "absolute", whiteSpace: "nowrap",
				right: "calc(100% + 1px)", zIndex: asHover ? 6 : 5,
			}}>
				<div style={{position: "relative", padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					<PanelButton parent={this} map={map} path={path} panel="probability" text="Probability" style={{marginTop: 0}}>
						<Span ml={5} style={{float: "right"}}>90%<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>1</sup></Span>
					</PanelButton>
					<PanelButton parent={this} map={map} path={path} panel="adjustment" text="Adjustment">
						<Span ml={5} style={{float: "right"}}>70%<sup style={{whiteSpace: "pre", top: -5, marginRight: -3, marginLeft: 1, fontSize: 10}}>1</sup></Span>
					</PanelButton>
					<Button text="..."
						style={{
							margin: "3px -3px -3px -3px", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
				<div style={{position: "relative", marginTop: 1, padding: 3, background: `rgba(0,0,0,.7)`, borderRadius: 5, boxShadow: `rgba(0,0,0,1) 0px 0px 2px`}}>
					<div style={{position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 5, background: `rgba(${backgroundColor},.7)`}}/>
					<PanelButton parent={this} map={map} path={path} panel="definitions" text="Definitions" style={{marginTop: 0}}/>
					<PanelButton parent={this} map={map} path={path} panel="questions" text="Questions"/>
					<PanelButton parent={this} map={map} path={path} panel="tags" text="Tags"/>
					<PanelButton parent={this} map={map} path={path} panel="discuss" text="Discuss (meta)"/>
					<PanelButton parent={this} map={map} path={path} panel="history" text="History"/>
					<Button text="..."
						style={{
							margin: "3px -3px -3px -3px", height: 17, lineHeight: "12px", padding: 0,
							position: "relative", display: "flex", justifyContent: "space-around", //alignItems: "center",
							background: null, boxShadow: null, borderRadius: "0 0 5px 5px",
							":hover": {background: `rgba(${backgroundColor},.5)`},
						}}/>
				</div>
			</div>
		);
	}
}

class PanelButton extends BaseComponent<{parent: MapNodeUI_LeftBox, map: Map, path: string, panel: string, text: string, style?}, {}> {
	render() {
		let {map, path, panel, text, style, children} = this.props;
		return (
			<Button text={text} style={E({position: "relative", display: "flex", justifyContent: "space-between", marginTop: 5, padding: "3px 7px"}, style)}
					onClick={()=> {
						//parent.props.parent.SetState({openPanel: panel});
						store.dispatch(new ACTMapNodePanelOpen({mapID: map._key.KeyToInt, path, panel}));
					}}
					onMouseEnter={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: panel});
					}}
					onMouseLeave={()=> {
						let {parent} = this.props;
						parent.props.parent.SetState({openPanel_preview: null});
					}}>
				{/*<div style={{position: "absolute", right: -4, width: 4, top: 0, bottom: 0}}/>*/}
				{children}
			</Button>
		);
	}
}