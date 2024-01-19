import {Column, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown_Remarkable, YoutubePlayer, YoutubePlayerState, Observer, RunInAction} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {store} from "Store";
import {Map, Timeline, GetTimelineStep, IsUserCreatorOrMod, MeID, GetTimelineStepTimeFromStart, TimelineStep} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {PositionOptionsEnum, StepEditorUI} from "../EditorSubpanel/StepEditorUI.js";
import {NodeRevealUI} from "../EditorSubpanel/NodeRevealUI.js";

@Observer
export class StepUI extends BaseComponentPlus(
	{} as {index: number, last: boolean, map: Map, timeline: Timeline, steps: TimelineStep[], step: TimelineStep, player: YoutubePlayer},
	{showNodeReveals: false, editorOpen: false},
) {
	constructor(props) {
		super(props);
		const {step} = this.props;
		// if a timeline-step has no message, then start the step out with node-reveals shown (some timelines are used only for the node-reveals, and this makes the UI work better for that case)
		if (step.message.trim().length == 0) {
			//this.SetState({showNodeReveals: true});
			this.state = {...this.state, showNodeReveals: true};
		}
	}

	render() {
		const {index, last, map, timeline, steps, step, player} = this.props;
		const nextStep = steps[index + 1];
		const {showNodeReveals, editorOpen} = this.state;
		const timeFromStart = GetTimelineStepTimeFromStart(step);

		let margin: string|undefined;
		if (step.groupID == PositionOptionsEnum.center) margin = "0 30px";
		if (step.groupID == PositionOptionsEnum.left) margin = "0 50px 0 0";
		if (step.groupID == PositionOptionsEnum.right) margin = "0 0 0 50px";

		return (
			// wrapper needed to emulate margin-top (since react-list doesn't support margins)
			<div style={{paddingTop: index == 0 ? 0 : 7}}>
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
									RunInAction("PlayingSubpanel.StepUI.jumpToStep", ()=>store.main.timelines.autoScroll = true);
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
					{step.nodeReveals && step.nodeReveals.length > 0 &&
					<Column style={E(
						{position: "relative", background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px"},
					)}>
						<div style={{fontSize: 11, opacity: 0.7, textAlign: "center", padding: "3px 5px", cursor: "pointer"}} onClick={()=>{
							this.SetState({showNodeReveals: !showNodeReveals});
						}}>
							Message affects display of {step.nodeReveals.length} node{step.nodeReveals.length > 1 ? "s" : ""}. (click to {showNodeReveals ? "hide" : "view"})
						</div>
						{showNodeReveals && step.nodeReveals &&
						<Column p="0 5px 5px 5px">
							{step.nodeReveals.map((nodeReveal, nodeRevealIndex)=>{
								return <NodeRevealUI key={nodeRevealIndex} map={map} step={step} nodeReveal={nodeReveal} editing={false} index={nodeRevealIndex}/>;
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
				</Column>
				{editorOpen &&
					<StepEditorUI index={index} map={map} timeline={timeline} step={step} nextStep={nextStep} draggable={false}/>}
			</div>
		);
	}
}