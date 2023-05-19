import {GetNode, GetNodeTagComps, GetNodeTags, NodeL3, TagComp_CloneHistory, Map, GetPathsWith1PlusFocusLevelAfterSteps, GetTimelineStep, GetTimelineSteps, GetNodeID, GetPathFocusLevelRangesWithinSteps, PathFocusLevelRange, NodeReveal, IsNodeRevealEmpty, TimelineStep} from "dm_common";
import {Clone, E, Vector2} from "js-vextensions";
import React from "react";
import {store} from "Store";
import {GetPlayingTimeline, GetPlayingTimelineStepIndex} from "Store/main/maps/mapStates/$mapState";
import {SearchResultRow} from "UI/@Shared/NavBar/SearchPanel.js";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Observer} from "web-vcore";
import {MapWithBailHandling} from "web-vcore/nm/mobx-graphlink.js";
import {Button, Column, Row, Select, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowVMenu, VMenuItem} from "web-vcore/nm/react-vmenu";
import {BoxController, ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ScrollView} from "web-vcore/nm/react-vscrollview";

@Observer
export class FocusNodeStatusMarker extends BaseComponent<{map: Map, node: NodeL3, path: string}, {}> {
	render() {
		const {map, node, path} = this.props;

		const playingTimeline = GetPlayingTimeline(map.id);
		const currentStepIndex = GetPlayingTimelineStepIndex(map.id);
		if (playingTimeline == null || currentStepIndex == null) return null;

		const steps = GetTimelineSteps(playingTimeline.id);
		const stepsReached = steps.slice(0, currentStepIndex + 1);
		const focusRanges = GetPathFocusLevelRangesWithinSteps(steps).filter(a=>a.path == path);
		const focusRangesReached = GetPathFocusLevelRangesWithinSteps(stepsReached).filter(a=>a.path == path);
		//const isFocusNode = GetPathsWith1PlusFocusLevelAfterSteps(steps).Any(a=>a == path);
		const currentFocusRange = focusRangesReached.LastOrX(a=>a.path == path);
		const closestFocusRangeWith1PlusLevel = focusRanges
			.filter(a=>a.focusLevel >= 1)
			.OrderBy(a=>(
				a.lastStep != null && a.lastStep < currentStepIndex ? currentStepIndex.Distance(a.lastStep) :
				a.firstStep > currentStepIndex ? currentStepIndex.Distance(a.firstStep) :
				0
			)).FirstOrX();
		const isFocusNode = (currentFocusRange?.focusLevel ?? 0) >= 1;

		const rangeToStr = (range: PathFocusLevelRange)=>`${range.firstStep + 1}${range.lastStep != null ? `-${range.lastStep + 1}` : "+"}`;

		return (
			<div style={{position: "absolute", right: "calc(100% - 37px)", top: 0, bottom: 0, display: "flex"}}>
				<Button
					text={
						//currentFocusRange != null && isFocusNode ? rangeToStr(currentFocusRange) :
						closestFocusRangeWith1PlusLevel != null ? rangeToStr(closestFocusRangeWith1PlusLevel) :
						"---"
					}
					title="This shows the closest step-range where this path is marked with a focus-level of 1+. (white-background if we're in that range, black otherwise)"
					style={E(
						{margin: "auto 0", padding: "0 1px", fontSize: 11},
						isFocusNode && {background: "rgba(255,255,255,.7)"},
						!isFocusNode && {background: "rgba(0,0,0,.7)", color: "rgba(200,200,200,1)"},
					)}
					onClick={e=>{
						const iToNum = (i: number)=>i + 1;
						const numToI = (num: number)=>num - 1;

						const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
						ShowVMenu(
							{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
							<>
								{focusRanges.map((range, index)=>{
									if (range.focusLevel == 0) return null;
									return <VMenuItem key={index} text={`Change range #${iToNum(index)} (focus: ${range.focusLevel}): steps ${rangeToStr(range)}`} style={liveSkin.Style_VMenuItem()} onClick={()=>{
										const oldFirstStepIndex = range.firstStep;
										const oldLastStepIndex = range.lastStep;
										let newFirstStepIndex = range.firstStep;
										let newLastStepIndex = range.lastStep;
										const nextRange = focusRanges[index + 1] as PathFocusLevelRange|n;

										const Change = (..._)=>controller.UpdateUI();
										var controller = ShowMessageBox({
											title: `Change range #${index + 1} (focus level: ${range.focusLevel})`, cancelButton: true,
											message: ()=><Column>
												<Row>
													<Text>First step:</Text>
													<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length - 1)} value={iToNum(newFirstStepIndex)} onChange={stepNumber=>Change(newFirstStepIndex = numToI(stepNumber))}/>
												</Row>
												<Row>
													<Text>Last step:</Text>
													{/*<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newEndStepIndex != null ? newEndStepIndex - 1 : steps.length)} onChange={stepNumber=>Change(newEndStepIndex = numToI(stepNumber) + 1)}/>*/}
													<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newLastStepIndex ?? steps.length)} onChange={stepNumber=>{
														const newVal = numToI(stepNumber);
														Change(newLastStepIndex = newVal <= steps.length - 1 ? newVal : null);
													}}/>
												</Row>
											</Column>,
											onOK: ()=>{
												ChangeStepsForFocusLevelRange({steps, range, nextRange, oldFirstStepIndex, oldLastStepIndex, newFirstStepIndex, newLastStepIndex});
											},
										});
									}}/>;
								})}
							</>,
						);
					}}/>
			</div>
		);
	}
}

async function ChangeStepsForFocusLevelRange(data: {
	steps: TimelineStep[], range: PathFocusLevelRange, nextRange: PathFocusLevelRange|n,
	oldFirstStepIndex: number, oldLastStepIndex: number|n,
	newFirstStepIndex: number, newLastStepIndex: number|n,
}) {
	const {steps, range, nextRange, oldFirstStepIndex, oldLastStepIndex, newFirstStepIndex, newLastStepIndex} = data;
	if (newFirstStepIndex != oldFirstStepIndex) {
		// first add new "NodeReveal" structure
		const newFirstStep = steps[newFirstStepIndex];
		const newFirstStep_newNodeReveals = Clone(newFirstStep.nodeReveals) as NodeReveal[];
		const matchingRevealToModify = newFirstStep_newNodeReveals.find(a=>a.path == range.path && a.changeFocusLevelTo == null);
		if (matchingRevealToModify) {
			matchingRevealToModify.changeFocusLevelTo = range.focusLevel;
		} else {
			newFirstStep_newNodeReveals.push(new NodeReveal({path: range.path, changeFocusLevelTo: range.focusLevel}));
		}
		await RunCommand_UpdateTimelineStep({id: newFirstStep.id, updates: {nodeReveals: newFirstStep_newNodeReveals}});

		// then remove the old "NodeReveal" structure
		const oldFirstStep = steps[oldFirstStepIndex];
		const oldFirstStep_newNodeReveals = Clone(oldFirstStep.nodeReveals) as NodeReveal[];
		const nodeRevealToChangeOrRemove = oldFirstStep_newNodeReveals.find(a=>a.path == range.path && a.changeFocusLevelTo == range.focusLevel);
		if (nodeRevealToChangeOrRemove) {
			// modify node-reveal to no longer change the focus-level
			nodeRevealToChangeOrRemove.changeFocusLevelTo = null;

			// if the modified node-reveal now "does nothing", also remove it
			if (IsNodeRevealEmpty(nodeRevealToChangeOrRemove)) {
				oldFirstStep_newNodeReveals.Remove(nodeRevealToChangeOrRemove);
			}

			await RunCommand_UpdateTimelineStep({id: oldFirstStep.id, updates: {nodeReveals: oldFirstStep_newNodeReveals}});
		}
	}

	// convert to "end step index" briefly, since easier to work with for change-applier code
	const oldEndStepIndex = oldLastStepIndex != null ? oldLastStepIndex + 1 : null;
	const newEndStepIndex = newLastStepIndex != null ? newLastStepIndex + 1 : null;
	if (newEndStepIndex != oldEndStepIndex) {
		// first add new "NodeReveal" structure
		const newEndStep = newEndStepIndex != null ? steps[newEndStepIndex] : null;
		if (newEndStep != null) {
			const newEndStep_newNodeReveals = Clone(newEndStep.nodeReveals) as NodeReveal[];
			const matchingRevealToModify = newEndStep_newNodeReveals.find(a=>a.path == range.path && a.changeFocusLevelTo == null);
			if (matchingRevealToModify) {
				matchingRevealToModify.changeFocusLevelTo = nextRange?.focusLevel ?? 0;
			} else {
				newEndStep_newNodeReveals.push(new NodeReveal({path: range.path, changeFocusLevelTo: nextRange?.focusLevel ?? 0}));
			}
			await RunCommand_UpdateTimelineStep({id: newEndStep.id, updates: {nodeReveals: newEndStep_newNodeReveals}});
		}

		// then remove the old "NodeReveal" structure
		const oldEndStep = oldEndStepIndex != null ? steps[oldEndStepIndex] : null;
		if (oldEndStep != null && nextRange != null) {
			const oldEndStep_newNodeReveals = Clone(oldEndStep.nodeReveals) as NodeReveal[];
			const nodeRevealToChangeOrRemove = oldEndStep_newNodeReveals.find(a=>a.path == range.path && a.changeFocusLevelTo == nextRange.focusLevel);
			if (nodeRevealToChangeOrRemove) {
				// modify node-reveal to no longer change the focus-level
				nodeRevealToChangeOrRemove.changeFocusLevelTo = null;

				// if the modified node-reveal now "does nothing", also remove it
				if (IsNodeRevealEmpty(nodeRevealToChangeOrRemove)) {
					oldEndStep_newNodeReveals.Remove(nodeRevealToChangeOrRemove);
				}

				await RunCommand_UpdateTimelineStep({id: oldEndStep.id, updates: {nodeReveals: oldEndStep_newNodeReveals}});
			}
		}
	}
}