import {Column, Div, Row} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {VReactMarkdown_Remarkable, YoutubePlayer, YoutubePlayerState, Observer, RunInAction} from "web-vcore";
import {E} from "js-vextensions";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {runInAction} from "mobx";
import {store} from "Store";
import {Map, Timeline, GetTimelineStep, IsUserCreatorOrMod, MeID, GetTimelineStepTimeFromStart, TimelineStep, GetNodeEffects} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {StepEditorUI} from "./Editing/StepEditorUI.js";
import {StepEffectUI} from "./Editing/StepEffectUI.js";
import {PositionOptionsEnum} from "./Editing/StepTabs/StepTab_General.js";

@Observer
export class StepUI extends BaseComponentPlus(
	{} as {index: number, last: boolean, map: Map, timeline: Timeline, steps: TimelineStep[], step: TimelineStep, player: YoutubePlayer},
	{showStepEffects: false, editorOpen: false},
) {
	constructor(props) {
		super(props);
		const {step} = this.props;
		// if a timeline-step has no message, then start the step out with node-effects shown (some timelines are used only for the node-effects, and this makes the UI work better for that case)
		if (step.message.trim().length == 0) {
			//this.SetState({showStepEffects: true});
			this.state = {...this.state, showStepEffects: true};
		}
	}

	render() {
		const {index, last, map, timeline, steps, step, player} = this.props;
		const nextStep = steps[index + 1];
		const {showStepEffects, editorOpen} = this.state;
		const timeFromStart = GetTimelineStepTimeFromStart(step);
		const nodeEffects = GetNodeEffects(step);

		const mapState = GetMapState(map.id);
		const editMode = mapState?.timelineEditMode ?? false;
		const editorOpen_final = editorOpen || editMode;
		//const playbackActive = mapState?.timelinePlayback ?? false;

		// atm, hide first step (when not edit-mode, and playback is enabled), since just intro message
		//if (index == 0 && !editMode && playbackActive) return null;

		let margin: string|undefined;
		if (step.groupID == PositionOptionsEnum.center) margin = "0 30px";
		if (step.groupID == PositionOptionsEnum.left) margin = "0 50px 0 0";
		if (step.groupID == PositionOptionsEnum.right) margin = "0 0 0 50px";

		return (
			// wrapper needed to emulate margin-top (since react-list doesn't support margins)
			<div style={{paddingTop: index == 0 ? 0 : 7}}>
				{!editMode &&
				<Column /* mt={index == 0 ? 0 : 7} */ m={margin}
					style={E(
						{background: liveSkin.BasePanelBackgroundColor().css(), borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"},
						player && timeFromStart != null && {cursor: "pointer"},
					)}
				>
					<Div sel p="7px 10px"
						onClick={()=>{
							if (player && timeFromStart != null) {
								// this shouldn't be necessary, but apparently is
								(async()=>{
									if (player.state == YoutubePlayerState.CUED) {
										player.Play();
										await player.WaitTillState(YoutubePlayerState.PLAYING);
									}
									// this.targetTime = step.videoTime;
									player.SetPosition(timeFromStart);
									// this.SetState({ targetTime: step.videoTime, autoScroll: true });
									// this.SetState({ autoScroll: true });
									RunInAction("StepList.StepUI.jumpToStep", ()=>store.main.timelines.autoScroll = true);
								})();
							}
						}}
						/* onClick={async () => {
							if (player && step.videoTime != null) {
								// this shouldn't be necessary, but apparently is
								if (player.state == YoutubePlayerState.CUED) {
									player.Play();
									await player.WaitTillState(YoutubePlayerState.PLAYING);
								}
								player.SetPosition(step.videoTime);
							}
						}} */
					>
						<Row style={{float: "right", fontSize: 16}}>{index + 1}</Row>
						<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
							className="onlyTopMargin"
							style={{
								marginTop: 5, display: "flex", flexDirection: "column",
								//filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"
							}}
							source={step.message} replacements={{}} extraInfo={{}}/>
					</Div>
					{nodeEffects.length > 0 &&
					<Column style={E(
						{position: "relative", background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px"},
					)}>
						<div style={{fontSize: 11, opacity: 0.7, textAlign: "center", padding: "3px 5px", cursor: "pointer"}} onClick={()=>{
							this.SetState({showStepEffects: !showStepEffects});
						}}>
							Message affects display of {nodeEffects.length} node{nodeEffects.length > 1 ? "s" : ""}. (click to {showStepEffects ? "hide" : "view"})
						</div>
						{showStepEffects &&
						<Column p="0 5px 5px 5px">
							{step.extras?.effects && step.extras.effects.map((effect, index)=>{
								return <StepEffectUI key={index} map={map} step={step} effect={effect} editing={false} index={index}/>;
							})}
						</Column>}
					</Column>}
					{IsUserCreatorOrMod(MeID(), timeline) &&
					<VMenuStub /*preOpen={e=>!e.handled}*/>
						<VMenuItem text={editorOpen ? "Close editor" : "Edit"} style={liveSkin.Style_VMenuItem()}
							onClick={e=>{
								if (e.button != 0) return;
								this.SetState({editorOpen: !editorOpen});
							}}/>
					</VMenuStub>}
				</Column>}
				{editorOpen_final &&
					<StepEditorUI index={index} map={map} timeline={timeline} step={step} nextStep={nextStep} draggable={editMode}/>}
			</div>
		);
	}
}