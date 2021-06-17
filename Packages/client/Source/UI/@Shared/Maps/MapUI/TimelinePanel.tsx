import {Button, Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {store} from "Store";
import {GetSelectedTimeline, GetTimelineOpenSubpanel, GetMapState} from "Store/main/maps/mapStates/$mapState";
import {runInAction} from "web-vcore/nm/mobx";
import {Observer} from "web-vcore";
import {TimelineSubpanel} from "Store/main/maps/mapStates/@MapState";
import {Map} from "dm_common";
import {CollectionSubpanel} from "../../Timelines/TimelinePanel/CollectionSubpanel";
import {EditorSubpanel} from "../../Timelines/TimelinePanel/EditorSubpanel";
import {PlayingSubpanel} from "../../Timelines/TimelinePanel/PlayingSubpanel";

@Observer
export class TimelinePanel extends BaseComponentPlus({} as {map: Map}, {}) {
	render() {
		const {map} = this.props;
		const subpanel = GetTimelineOpenSubpanel(map._key);

		const mapInfo = GetMapState(map._key);
		function SetSubpanel(subpanel: TimelineSubpanel) {
			runInAction("TimelinePanel.SetSubpanel", ()=>mapInfo.timelineOpenSubpanel = subpanel);
		}
		return (
			<Row style={{height: "100%", alignItems: "flex-start"}}>
				<Column className="clickThrough" style={{width: 600, height: "100%", background: "rgba(0,0,0,.7)" /* borderRadius: "10px 10px 0 0" */}}>
					<Row>
						<Button text="Collection" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.Collection)}/>
						<Button text="Editor" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.Editor)}/>
						<Button text="Playing" style={{flex: 1}} onClick={()=>SetSubpanel(TimelineSubpanel.Playing)}/>
					</Row>
					{subpanel == TimelineSubpanel.Collection && <CollectionSubpanel map={map}/>}
					{subpanel == TimelineSubpanel.Editor && <EditorSubpanel map={map}/>}
					{subpanel == TimelineSubpanel.Playing && <PlayingSubpanel map={map}/>}
				</Column>
			</Row>
		);
	}
}