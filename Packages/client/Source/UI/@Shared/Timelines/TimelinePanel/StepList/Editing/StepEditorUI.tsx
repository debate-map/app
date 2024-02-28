import {store} from "Store";
import {RunCommand_AddTimelineStep, RunCommand_DeleteTimelineStep, RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {liveSkin} from "Utils/Styles/SkinManager";
import {DraggableInfo, DroppableInfo} from "Utils/UI/DNDStructures.js";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {GetNodeEffects, GetTimelineSteps, IsUserCreatorOrMod, Map, MeID, OrderKey, Timeline, TimelineStep, TimelineStepEffect, TimelineStepEffect_defaultTransitionPeriod} from "dm_common";
import {DragInfo, MakeDraggable, Observer, RunInAction_Set} from "web-vcore";
import {Clone, E, GetEntries, ModifyString, ToJSON, VRect, Vector2, WaitXThenRun} from "web-vcore/nm/js-vextensions.js";
import {RunInAction} from "web-vcore/nm/mobx-graphlink.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "web-vcore/nm/react-beautiful-dnd.js";
import {Button, Column, Pre, Row, Select, Spinner, Text, TextArea, TimeSpanInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus, GetDOM} from "web-vcore/nm/react-vextensions.js";
import {ShowVMenu, VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {ShowSignInPopup} from "UI/@Shared/NavBar/UserPanel.js";
import {StepTab} from "Store/main/maps/mapStates/@MapState.js";
import React, {useState} from "react";
import {StepEffectUI} from "./StepEffectUI.js";
import {StepEffectUI_Menu_Stub} from "./StepEffectUI_Menu.js";
import {StepTab_General} from "./StepTabs/StepTab_General.js";
import {StepTab_Audio} from "./StepTabs/StepTab_Audio.js";

/* let portal: HTMLElement;
WaitXThenRun(0, () => {
	portal = document.createElement('div');
	document.body.appendChild(portal);
}); */

export type StepEditorUIProps = {index: number, map: Map, timeline: Timeline, step: TimelineStep, nextStep: TimelineStep|n, draggable?: boolean} & {dragInfo?: DragInfo};
export type StepEditorUI_SharedProps = {map: Map, step: TimelineStep, nextStep: TimelineStep|n, creatorOrMod: boolean};

export async function AddTimelineStep_Simple(timelineID: string, steps: TimelineStep[], insertIndex: number) {
	if (MeID() == null) return ShowSignInPopup();
	if (steps == null) return; // steps must still be loading; just ignore the click

	// calculate the insert-index to be just after the middle entry of the visible-step-range
	/*const visibleStepRange = this.stepList?.getVisibleRange() ?? [steps.length - 1, steps.length - 1];
	const insertIndex = Math.floor(visibleStepRange.Average() + 1);*/

	const prevStepForInsert = steps[insertIndex - 1];
	const nextStepForInsert = steps[insertIndex];

	const newStep = new TimelineStep({
		timelineID,
		orderKey: OrderKey.between(prevStepForInsert?.orderKey, nextStepForInsert?.orderKey).toString(),
		groupID: "full",
		message: "",
		//nodeReveals: [],
	});
	await RunCommand_AddTimelineStep(newStep);
}

@MakeDraggable(({index, step, draggable}: StepEditorUIProps)=>{
	if (draggable == false) return undefined as any; // completely disable draggable behavior (see web-vcore/.../DNDHelpers.tsx for more info)
	// upgrade note: make sure dnd isn't broken from having to comment the next line out
	// if (step == null) return null; // if step is not yet loaded, don't actually apply the draggable-wrapping
	return {
		type: "TimelineStep",
		draggableInfo: new DraggableInfo({stepID: step.id}),
		index,
		//enabled: step != null, // if step is not yet loaded, don't actually apply the draggable-wrapping
	};
})
@Observer
// @SimpleShouldUpdate({ propsToIgnore: ['dragInfo'] })
export class StepEditorUI extends BaseComponentPlus({} as StepEditorUIProps, {placeholderRect: null as VRect|n}) {
	lastHeaderTabDefault: StepTab;
	render() {
		const {index, map, timeline, step, nextStep, dragInfo} = this.props;
		const {placeholderRect} = this.state;
		//const step = GetTimelineStep(stepID);
		const creatorOrMod = IsUserCreatorOrMod(MeID(), timeline);
		const timelinesUIState = store.main.timelines;
		const nodeEffects = GetNodeEffects(step);

		const [tabOverride, setTabOverride] = useState<StepTab|n>(null);
		const headerTab = tabOverride ?? timelinesUIState.stepTabDefault;
		if (timelinesUIState.stepTabDefault != this.lastHeaderTabDefault) {
			WaitXThenRun(0, ()=>setTabOverride(timelinesUIState.stepTabDefault));
		}
		this.lastHeaderTabDefault = timelinesUIState.stepTabDefault;

		if (step == null) {
			return <div style={{height: 100}}><div {...(dragInfo && dragInfo.provided.draggableProps)} {...(dragInfo && dragInfo.provided.dragHandleProps)}/></div>;
		}

		const steps = GetTimelineSteps(timeline.id);
		const opfsForStep = OPFS_Map.GetEntry(map.id).GetStepFolder(step.id);
		const takeMetas = opfsForStep.Files.map(a=>a.name.match(/^Take(\d+)_/)?.[1]?.ToInt()).Distinct().filter(a=>a != null) as number[];

		const asDragPreview = dragInfo && dragInfo.snapshot.isDragging;
		const sharedProps = {map, step, nextStep, creatorOrMod};
		const result = (
			// wrapper needed to emulate margin-top (since react-list doesn't support margins)
			<div style={{paddingTop: index == 0 ? 0 : 7}}>
				<Column /* mt={index == 0 ? 0 : 7} */ {...(dragInfo && dragInfo.provided.draggableProps)}
					style={E(
						{
							background: liveSkin.BasePanelBackgroundColor().alpha(1).css(), borderRadius: 10,
							//border: "1px solid rgba(255,255,255,.15)"
						},
						dragInfo && dragInfo.provided.draggableProps.style,
						asDragPreview && {zIndex: zIndexes.draggable},
					)}>
					<Row center p="3px 7px" style={{
						borderRadius: "10px 10px 0 0",
						/*background: "rgba(0,0,0,.7)",
						color: "rgba(255,255,255,.7)",*/
					}}>
						<Pre sel>{step.id.slice(0, 3)}</Pre>
						<Pre> (#{index + 1})</Pre>
						{/* <Button ml={5} text="Edit" title="Edit this step" style={{ flexShrink: 0 }} onClick={() => {
							ShowEditTimelineStepDialog(MeID(), step);
						}}/> */}
						<div {...(dragInfo && dragInfo.provided.dragHandleProps)} style={E({flex: 1, maxWidth: 100, alignSelf: "stretch", margin: "0 5px", borderRadius: 20, background: "rgba(0,0,0,.1)"})}/>
						<Row center ml="auto">
							<Select displayType="button bar" value={tabOverride} onChange={val=>setTabOverride(val)}
								/*ref={c=>{
									const audioOptionEl: HTMLOptionElement|n = (c && c.DOM_HTML && Array.from(c.DOM_HTML.childNodes).find(a=>(a as HTMLElement).innerText == "  Audio  "));
									if (audioOptionEl) audioOptionEl.style.whiteSpace = "pre";
								}}*/
								childStyle={{whiteSpace: "pre"}} // needed for "  Audio  " to show up with extra whitespace (to keep same width as the with-number instances)
								options={GetEntries(StepTab, name=>{
									name = ModifyString(name, m=>[m.startLower_to_upper]);
									if (name == "Audio") {
										if (takeMetas.length == 0) return `  Audio  `;
										return `Audio (${takeMetas.length})`;
									}
									return name;
								})}/>
							<Button ml={5} mdIcon="dots-vertical" onClick={e=>{
								const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
								ShowVMenu(
									{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
									<>
										<VMenuItem text="Add step (above)" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											AddTimelineStep_Simple(timeline.id, steps, index);
										}}/>
										<VMenuItem text="Add step (below)" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											AddTimelineStep_Simple(timeline.id, steps, index + 1);
										}}/>
										<VMenuItem text="Clone" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()}
											onClick={e=>{
												if (e.button != 0) return;
												const newTimelineStep = Clone(step);
												newTimelineStep.orderKey = new OrderKey(step.orderKey).next().toString();
												RunCommand_AddTimelineStep(newTimelineStep);
											}}/>
										<VMenuItem text="Delete" enabled={creatorOrMod} style={liveSkin.Style_VMenuItem()} onClick={()=>{
											ShowMessageBox({
												title: `Delete step ${index + 1}`, cancelButton: true,
												message: `
													Delete timeline step with text:
			
													${step.message}
												`.AsMultiline(0),
												onOK: ()=>{
													RunCommand_DeleteTimelineStep({id: step.id});
												},
											});
										}}/>
									</>,
								);
							}}/>
						</Row>
					</Row>
					{headerTab == StepTab.general && <StepTab_General {...sharedProps}/>}
					{headerTab == StepTab.audio && <StepTab_Audio {...sharedProps}/>}
					{/* <Row ml={5} style={{ minHeight: 20 }}>{step.message}</Row> */}
					<TextArea /* {...{ useCacheForDOMMeasurements: true } as any} */ autoSize={true}
						style={{
							//background: "rgba(255,255,255,.2)",
							padding: 5, outline: "none",
							borderWidth: "1px 0 1px 0",
						}}
						value={step.message} enabled={creatorOrMod}
						onChange={val=>{
							RunCommand_UpdateTimelineStep({id: step.id, updates: {message: val}});
						}}/>
					<Droppable type="NodeL1" droppableId={ToJSON(new DroppableInfo({type: "TimelineStepNodeRevealList", timelineID: timeline.id, stepID: step.id}))} isDropDisabled={!creatorOrMod}>
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
							const dragIsOverDropArea = (provided.placeholder as any)?.props["on"] != null;
							if (dragIsOverDropArea) {
								WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
							}

							return (
								<Column ref={c=>{ this.nodeHolder = c; provided.innerRef(GetDOM(c) as any); }} {...provided.droppableProps}
									style={E(
										{
											position: "relative", padding: 7, background: "rgba(255,255,255,.3)", borderRadius: "0 0 10px 10px",
											//border: "solid rgba(0,0,0,.7)", borderWidth: "0 1px 1px 1px"
										},
										nodeEffects.length == 0 && {padding: "3px 5px"},
									)}>
									<Row>
										<Text>Effects:</Text>
										<Button ml={5} mdIcon="plus" onClick={e=>{
											const buttonRect = (e.target as HTMLElement).getBoundingClientRect();
											ShowVMenu(
												{pos: new Vector2(buttonRect.left, buttonRect.top + buttonRect.height)},
												<>
													<VMenuItem text="Set time-tracker state: visible" style={liveSkin.Style_VMenuItem()} onClick={()=>{
														const newEffects = [
															...(step.extras?.effects ?? []),
															new TimelineStepEffect({setTimeTrackerState: true}),
														];
														RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
													}}/>
													<VMenuItem text="Set time-tracker state: hidden" style={liveSkin.Style_VMenuItem()} onClick={()=>{
														const newEffects = [
															...(step.extras?.effects ?? []),
															new TimelineStepEffect({setTimeTrackerState: false}),
														];
														RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
													}}/>
													<VMenuItem text="Set transition period" style={liveSkin.Style_VMenuItem()} onClick={()=>{
														const newEffects = [
															...(step.extras?.effects ?? []),
															new TimelineStepEffect({setTransitionPeriod: TimelineStepEffect_defaultTransitionPeriod}),
														];
														RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
													}}/>
												</>,
											);
										}}/>
										{//(step.nodeReveals == null || step.nodeReveals.length == 0) && !dragIsOverDropArea &&
										<div style={{flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, opacity: 0.7, textAlign: "center"}} onContextMenu={e=>e.preventDefault()}>
											Drag nodes here to give them time-bound effects: display, expand, etc.
											<StepEffectUI_Menu_Stub step={step} effect={null} effectIndex={-1}/>
										</div>}
									</Row>
									{step.extras?.effects && step.extras.effects.map((effect, index)=>{
										return <StepEffectUI key={index} map={map} step={step} effect={effect} editing={true} index={index}/>;
									})}
									{provided.placeholder}
									{dragIsOverDropArea && placeholderRect &&
										<div style={{
											// position: 'absolute', left: 0 /* placeholderRect.x */, top: placeholderRect.y, width: placeholderRect.width, height: placeholderRect.height,
											position: "absolute", left: 7 /* placeholderRect.x */, top: placeholderRect.y, right: 7, height: placeholderRect.height,
											border: "1px dashed rgba(255,255,255,1)", borderRadius: 5,
										}}/>}
								</Column>
							);
						}}
					</Droppable>
				</Column>
			</div>
		);

		// if drag preview, we have to put in portal, since otherwise the "filter" effect of ancestors causes the {position:fixed} style to not be relative-to-page
		/* if (asDragPreview) {
			return ReactDOM.createPortal(result, portal);
		} */
		return result;
	}
	nodeHolder: Row|n;

	StartGeneratingPositionedPlaceholder() {
		if (this.nodeHolder == null || !this.nodeHolder.mounted || this.nodeHolder.DOM == null) {
			// call again in a second, once node-holder is initialized
			WaitXThenRun(0, ()=>this.StartGeneratingPositionedPlaceholder());
			return;
		}

		const nodeHolderRect = VRect.FromLTWH(this.nodeHolder.DOM.getBoundingClientRect());
		const dragBox = document.querySelector(".NodeBox.DragPreview");
		if (dragBox == null) return; // this can happen at end of drag
		const dragBoxRect = VRect.FromLTWH(dragBox.getBoundingClientRect());

		const siblingNodeUIs = (Array.from(this.nodeHolder.DOM.childNodes) as HTMLElement[]).filter(a=>a.classList.contains("NodeUI"));
		const siblingNodeUIInnerDOMs = siblingNodeUIs.map(nodeUI=>nodeUI.QuerySelector_BreadthFirst(".NodeBox")).filter(a=>a != null); // entry can be null if inner-ui still loading
		const firstOffsetInner = siblingNodeUIInnerDOMs.find(a=>a && a.style.transform && a.style.transform.includes("translate("));

		let placeholderRect: VRect;
		if (firstOffsetInner) {
			const firstOffsetInnerRect = VRect.FromLTWH(firstOffsetInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
			const firstOffsetInnerRect_relative = new VRect(firstOffsetInnerRect.Position.Minus(nodeHolderRect.Position), firstOffsetInnerRect.Size);

			placeholderRect = firstOffsetInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
		} else {
			if (siblingNodeUIInnerDOMs.length && siblingNodeUIInnerDOMs.Last() != null) {
				const lastInner = siblingNodeUIInnerDOMs.Last()!;
				const lastInnerRect = VRect.FromLTWH(lastInner.getBoundingClientRect()).NewTop(top=>top - dragBoxRect.height);
				const lastInnerRect_relative = new VRect(lastInnerRect.Position.Minus(nodeHolderRect.Position), lastInnerRect.Size);

				placeholderRect = lastInnerRect_relative.NewWidth(dragBoxRect.width).NewHeight(dragBoxRect.height);
				// if (dragBoxRect.Center.y > firstOffsetInnerRect.Center.y) {
				placeholderRect.y += lastInnerRect.height;
			} else {
				// placeholderRect = new VRect(Vector2.zero, dragBoxRect.Size);
				placeholderRect = new VRect(new Vector2(7, 7), dragBoxRect.Size); // adjust for padding
			}
		}

		if (!placeholderRect.Equals(this.state.placeholderRect)) {
			this.SetState({placeholderRect});
		}
	}
}