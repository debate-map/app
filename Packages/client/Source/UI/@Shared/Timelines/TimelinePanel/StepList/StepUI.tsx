import {Column, Div, Row} from "react-vcomponents";
import {VReactMarkdown_Remarkable, YoutubePlayer, YoutubePlayerState, RunInAction} from "web-vcore";
import {E} from "js-vextensions";
import {VMenuItem, VMenuStub} from "react-vmenu";
import {store} from "Store";
import {DMap, Timeline, MeID, GetTimelineStepTimeFromStart, TimelineStep, GetNodeEffects, PERMISSIONS} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {GetMapState} from "Store/main/maps/mapStates/$mapState.js";
import {StepEditorUI} from "./Editing/StepEditorUI.js";
import {StepEffectUI} from "./Editing/StepEffectUI.js";
import {PositionOptionsEnum} from "./Editing/StepTabs/StepTab_General.js";
import {observer_mgl} from "mobx-graphlink";
import {Ref, useState} from "react";
import React from "react";

type StepUI_Props = {
	index: number,
	last: boolean,
	map: DMap,
	timeline: Timeline,
	steps: TimelineStep[],
	step: TimelineStep,
	player: YoutubePlayer
	ref?: Ref<HTMLDivElement>,
};

export const StepUI = observer_mgl((props: StepUI_Props)=>{
	const {index, map, timeline, steps, step, player, ref} = props;
	const [showStepEffects, setShowStepEffects] = useState(()=>{
		// if a timeline-step has no message, then start the step out with node-effects shown (some timelines are used only for the node-effects, and this makes the UI work better for that case)
		return step.message.trim().length === 0;
	});
	const [editorOpen, setEditorOpen] = useState(false);

	const nextStep = steps[index + 1];
	const timeFromStart = GetTimelineStepTimeFromStart(step);
	const nodeEffects = GetNodeEffects(step);

	const mapState = GetMapState(map.id);
	const editMode = mapState?.timelineEditMode ?? false;
	const editorOpen_final = editorOpen || editMode;

	let margin: string|undefined;
	if (step.groupID == PositionOptionsEnum.center) margin = "0 30px";
	if (step.groupID == PositionOptionsEnum.left) margin = "0 50px 0 0";
	if (step.groupID == PositionOptionsEnum.right) margin = "0 0 0 50px";

	const handleRef = (c: HTMLDivElement | null)=>{
		if (!ref) return;

		if (typeof ref === "function") ref(c)
		else ref.current = c;
	}

	return (
		// wrapper needed to emulate margin-top (since react-list doesn't support margins)
		<div ref={handleRef} style={{paddingTop: index == 0 ? 0 : 7}}>
			{!editMode &&
			<Column m={margin}
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
								player.SetPosition(timeFromStart);
								RunInAction("StepList.StepUI.jumpToStep", ()=>store.main.timelines.autoScroll = true);
							})();
						}
					}}
				>
					<Row style={{float: "right", fontSize: 16}}>{index + 1}</Row>
					<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
						className="onlyTopMargin"
						style={{
							marginTop: 5, display: "flex", flexDirection: "column",
						}}
						source={step.message} replacements={{}} extraInfo={{}}/>
				</Div>
				{nodeEffects.length > 0 &&
				<Column style={E(
					{position: "relative", background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px"},
				)}>
					<div style={{fontSize: 11, opacity: 0.7, textAlign: "center", padding: "3px 5px", cursor: "pointer"}} onClick={()=>{
						setShowStepEffects(!showStepEffects);
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
				{PERMISSIONS.Timeline.Modify(MeID(), timeline) &&
				<VMenuStub>
					<VMenuItem text={editorOpen ? "Close editor" : "Edit"} style={liveSkin.Style_VMenuItem()}
						onClick={e=>{
							if (e.button != 0) return;
							setEditorOpen(!editorOpen);
						}}/>
				</VMenuStub>}
			</Column>}
			{editorOpen_final &&
				<StepEditorUI index={index} map={map} timeline={timeline} step={step} nextStep={nextStep} draggable={editMode}/>}
		</div>
	);
})
