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
										const newRange: PathFocusLevelRange = {...range};

										const Change = (..._)=>controller.UpdateUI();
										var controller = ShowMessageBox({
											title: `Change range #${index + 1} (focus level: ${range.focusLevel})`, cancelButton: true,
											message: ()=><Column>
												<Row>
													<Text>First step:</Text>
													<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length - 1)} value={iToNum(newRange.firstStep)} onChange={stepNumber=>Change(newRange.firstStep = numToI(stepNumber))}/>
												</Row>
												<Row>
													<Text>Last step:</Text>
													{/*<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newEndStepIndex != null ? newEndStepIndex - 1 : steps.length)} onChange={stepNumber=>Change(newEndStepIndex = numToI(stepNumber) + 1)}/>*/}
													<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newRange.lastStep ?? steps.length)} onChange={stepNumber=>{
														const newVal = numToI(stepNumber);
														newRange.lastStep = newVal <= steps.length - 1 ? newVal : null;
														newRange.endStep = newRange.lastStep ? newRange.lastStep + 1 : null;
														Change();
													}}/>
												</Row>
											</Column>,
											onOK: ()=>{
												AddOrUpdateFocusLevelRange({baseSteps: steps, baseRanges: focusRanges, oldRange: range, newRange});
											},
										});
									}}/>;
								})}
								<VMenuItem text={`Add range`} style={liveSkin.Style_VMenuItem()} onClick={()=>{
									const newRange: PathFocusLevelRange = {path, focusLevel: 1, firstStep: currentStepIndex, lastStep: null, endStep: null};

									const Change = (..._)=>controller.UpdateUI();
									var controller = ShowMessageBox({
										title: `Add range (focus level: ${newRange.focusLevel})`, cancelButton: true,
										message: ()=><Column>
											<Row>
												<Text>Focus level:</Text>
												<Spinner ml={5} min={0} max={1} value={newRange.focusLevel} onChange={val=>Change(newRange.focusLevel = val)}/>
											</Row>
											<Row>
												<Text>First step:</Text>
												<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length - 1)} value={iToNum(newRange.firstStep)} onChange={stepNumber=>Change(newRange.firstStep = numToI(stepNumber))}/>
											</Row>
											<Row>
												<Text>Last step:</Text>
												{/*<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newEndStepIndex != null ? newEndStepIndex - 1 : steps.length)} onChange={stepNumber=>Change(newEndStepIndex = numToI(stepNumber) + 1)}/>*/}
												<Spinner ml={5} min={iToNum(0)} max={iToNum(steps.length)} value={iToNum(newRange.lastStep ?? steps.length)} onChange={stepNumber=>{
													const newVal = numToI(stepNumber);
													newRange.lastStep = newVal <= steps.length - 1 ? newVal : null;
													newRange.endStep = newRange.lastStep ? newRange.lastStep + 1 : null;
													Change();
												}}/>
											</Row>
										</Column>,
										onOK: ()=>{
											AddOrUpdateFocusLevelRange({baseSteps: steps, baseRanges: focusRanges, oldRange: null, newRange});
										},
									});
								}}/>
							</>,
						);
					}}/>
			</div>
		);
	}
}

async function AddOrUpdateFocusLevelRange(data: {
	baseSteps: TimelineStep[],
	baseRanges: PathFocusLevelRange[],
	oldRange: PathFocusLevelRange|n,
	newRange: PathFocusLevelRange,
}) {
	const {baseSteps, baseRanges, oldRange, newRange} = data;
	const nodePath = newRange.path;
	const steps = Clone(baseSteps);
	const updatedStepIndexes_forRemovingEffects = new Set<number>();
	const updatedStepIndexes_forAddingEffects = new Set<number>();

	// clear focus-level-setting at the old first-step (if any)
	if (oldRange != null) {
		const oldFirstStep = steps[oldRange.firstStep];
		const nodeRevealToChangeOrRemove = oldFirstStep.nodeReveals.find(a=>a.path == oldRange.path && a.changeFocusLevelTo == oldRange.focusLevel);
		if (nodeRevealToChangeOrRemove) {
			// modify node-reveal to no longer change the focus-level
			nodeRevealToChangeOrRemove.changeFocusLevelTo = null;
			updatedStepIndexes_forRemovingEffects.add(oldRange.firstStep);
		}
	}

	// set focus-level at new first-step
	{
		const newFirstStep = steps[newRange.firstStep];
		const matchingRevealToModify = newFirstStep.nodeReveals.find(a=>a.path == newRange.path); // && a.changeFocusLevelTo == null);
		if (matchingRevealToModify) {
			matchingRevealToModify.changeFocusLevelTo = newRange.focusLevel;
		} else {
			newFirstStep.nodeReveals.push(new NodeReveal({path: newRange.path, changeFocusLevelTo: newRange.focusLevel}));
		}
		updatedStepIndexes_forAddingEffects.add(newRange.firstStep);
	}

	// clear focus-level-setting at the old end-step (if any)
	const oldEndStep = oldRange?.endStep != null ? steps[oldRange.endStep] : null;
	if (oldRange != null && oldEndStep != null) {
		for (const nodeReveal of oldEndStep.nodeReveals) {
			if (nodeReveal.path == oldRange.path) {
				nodeReveal.changeFocusLevelTo = null;
				updatedStepIndexes_forRemovingEffects.add(oldRange.endStep!);
			}
		}
	}

	// set focus-level at new end-step
	const newEndStep = newRange.endStep != null ? steps[newRange.endStep] : null;
	if (newEndStep != null) {
		const focusLevelToUseAfterThisRange =
			// if there was a range just after our old-range, use its focus-level after our new range (since our new range is just a moved/resized version of it)
			(oldRange != null ? baseRanges.find(a=>a.firstStep == oldRange.endStep)?.focusLevel : null) ??
			// else, infer what the focus-level should be afterward, based on any base-ranges that cover our new end-step (and have a different focus-level than our new range, to avoid sampling its own old-range)
			(newRange.endStep != null ? baseRanges.find(a=>{
				const targetIndex = newRange.endStep!;
				const rangeCoversTargetIndex = targetIndex >= a.firstStep && (a.lastStep == null || targetIndex <= a.lastStep);
				return rangeCoversTargetIndex && a.focusLevel != newRange.focusLevel;
			})?.focusLevel : null) ??
			0;

		const matchingRevealToModify = newEndStep.nodeReveals.find(a=>a.path == newRange.path); //&& a.changeFocusLevelTo == null);
		if (matchingRevealToModify) {
			matchingRevealToModify.changeFocusLevelTo = focusLevelToUseAfterThisRange;
		} else {
			newEndStep.nodeReveals.push(new NodeReveal({path: newRange.path, changeFocusLevelTo: focusLevelToUseAfterThisRange}));
		}
		updatedStepIndexes_forAddingEffects.add(newRange.endStep!);
	}

	// first, update steps that are only having effects added to them (so that if commands are interrupted, entries are merely duplicated rather than lost)
	await UpdateStepsAtIndexes([...updatedStepIndexes_forAddingEffects].Exclude(...updatedStepIndexes_forRemovingEffects));
	// then, update the remaining steps, that have effects removed from them
	await UpdateStepsAtIndexes([...updatedStepIndexes_forRemovingEffects]);

	async function UpdateStepsAtIndexes(updatedStepIndexes: number[]) {
		for (const stepIndex of updatedStepIndexes) {
			const oldNodeRevealsJSON = JSON.stringify(baseSteps[stepIndex].nodeReveals);
			const newNodeRevealsJSON = JSON.stringify(steps[stepIndex].nodeReveals);
			if (newNodeRevealsJSON != oldNodeRevealsJSON) {
				// if there are any node-reveals (with this node's path) that are empty, exclude them
				const finalNodeReveals = steps[stepIndex].nodeReveals.filter(a=>{
					if (a.path == nodePath && IsNodeRevealEmpty(a)) return false;
					return true;
				});
				await RunCommand_UpdateTimelineStep({id: steps[stepIndex].id, updates: {nodeReveals: finalNodeReveals}});
			}
		}
	}
}