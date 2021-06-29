// import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
// import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
// import {store} from "Store";
// import {GetSelectedTimeline, GetTimelineOpenSubpanel, GetMapState} from "Store/main/maps/mapStates/$mapState.js";
// import {runInAction} from "web-vcore/nm/mobx.js";
// import {Observer} from "web-vcore";
// import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState.js";
// import {Map} from "dm_common";
// import {CollectionSubpanel} from "./TimelinePanel/CollectionSubpanel.js";
// import {EditorSubpanel} from "./TimelinePanel/EditorSubpanel.js";
// import {PlayingSubpanel} from "./TimelinePanel/PlayingSubpanel.js";

// @Observer
// export class TimelinePanel extends BaseComponentPlus({} as {map: Map}, {}) {
// 	render() {
// 		const {map} = this.props;
// 		const subpanel = GetTimelineOpenSubpanel(map.id);

// 		const mapState = GetMapState(map.id);
// 		function SetSubpanel(subpanel: TimelineSubpanel) {
// 			runInAction("TimelinePanel.SetSubpanel", ()=>mapState.timelineOpenSubpanel = subpanel);
// 		}
// 		return (
// 			<Row style={{height: "100%", alignItems: "flex-start"}}>
// 				<Column className="clickThrough" style={{width: 600, height: "100%", background: "rgba(0,0,0,.7)" /* borderRadius: "10px 10px 0 0" */}}>
// 					<Row>
// 						<Button text="Collection" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.collection)}/>
// 						<Button text="Editor" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.editor)}/>
// 						<Button text="Playing" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.playing)}/>
// 					</Row>
// 					{subpanel == TimelineSubpanel.collection && <CollectionSubpanel map={map}/>}
// 					{subpanel == TimelineSubpanel.editor && <EditorSubpanel map={map}/>}
// 					{subpanel == TimelineSubpanel.playing && <PlayingSubpanel map={map}/>}
// 				</Column>
// 			</Row>
// 		);
// 	}
// }