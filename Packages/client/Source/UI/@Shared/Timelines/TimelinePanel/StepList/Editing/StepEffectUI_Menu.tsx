import {Clone, DeepEquals, E, GetValues} from "web-vcore/nm/js-vextensions.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {GetAsync, SlicePath} from "web-vcore/nm/mobx-graphlink.js";
import {BaseComponent, BaseComponentPlus, WarnOfTransientObjectProps} from "web-vcore/nm/react-vextensions.js";
import {VMenuItem, VMenuStub} from "web-vcore/nm/react-vmenu.js";
import {store} from "Store";
import {GetPathsToNodesChangedSinceX} from "Store/db_ext/mapNodeEdits.js";
import {GetOpenMapID} from "Store/main";
import {ACTCopyNode, GetCopiedNode, GetCopiedNodePath} from "Store/main/maps";
import {ForCopy_GetError, ForCut_GetError, CheckUserCanDeleteNode, GetNodeChildrenL3, GetNodeID, GetParentNodeL3, ChildGroup, GetValidNewChildTypes, ClaimForm, NodeL3, Polarity, GetNodeTypeDisplayName, NodeType, NodeType_Info, MeID, GetUserPermissionGroups, IsUserCreatorOrMod, Map, GetChildLayout_Final, GetNodeDisplayText, Me, TimelineStep, NodeEffect, TimelineStepEffect, GetTimelineStep, GetNodeL3} from "dm_common";
import {ES, Observer, RunInAction, RunInAction_Set} from "web-vcore";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import React from "react";
import {GetCopiedNodeEffectInfo_IfValid} from "Store/main/timelines";
import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";

type Props = {step: TimelineStep, effect: TimelineStepEffect|n, effectIndex: number};

export class StepEffectUI_Menu_Stub extends BaseComponent<Props & {delayEventHandler?: boolean}, {}> {
	render() {
		const {delayEventHandler, ...rest} = this.props;
		return (
			<VMenuStub delayEventHandler={delayEventHandler ?? true} preOpen={e=>!e.handled}>
				<StepEffectUI_Menu {...rest}/>
			</VMenuStub>
		);
	}
}

@WarnOfTransientObjectProps
@Observer
export class StepEffectUI_Menu extends BaseComponent<Props, {}> {
	render() {
		const {step, effect, effectIndex} = this.props;
		const copiedEffectInfo = GetCopiedNodeEffectInfo_IfValid();
		const copiedEffectInfo_step = copiedEffectInfo ? GetTimelineStep(copiedEffectInfo.stepID) : null;
		const copiedEffectInfo_affectedNode = copiedEffectInfo?.effectData.nodeEffect ? GetNodeL3(copiedEffectInfo.effectData.nodeEffect.path) : null;

		return (
			<>
				{effect != null && <VMenuItem text={<span>Cut <span style={{fontSize: 10, opacity: 0.7}}>(for moving effect to another step)</span></span> as any}
					style={liveSkin.Style_VMenuItem()}
					onClick={e=>{
						RunInAction_Set(this, ()=>store.main.timelines.copiedNodeEffectInfo = {stepID: step.id, effectIndex, effectData: Clone(effect), asCut: true});
					}}/>}
				{effect != null && <VMenuItem text={<span>Copy <span style={{fontSize: 10, opacity: 0.7}}>(for cloning effect to another step)</span></span> as any} style={liveSkin.Style_VMenuItem()}
					onClick={e=>{
						RunInAction_Set(this, ()=>store.main.timelines.copiedNodeEffectInfo = {stepID: step.id, effectIndex, effectData: Clone(effect), asCut: false});
					}}/>}
				{copiedEffectInfo &&
					<VMenuItem text={[
						`Paste ${copiedEffectInfo.asCut ? "cut" : "copied"} effect`,
						copiedEffectInfo_affectedNode ? ` (affecting node: ${GetNodeDisplayText(copiedEffectInfo_affectedNode).KeepAtMost(50)})` : "",
					].join("")} style={liveSkin.Style_VMenuItem()} onClick={async e=>{
						// if we're doing a cut->paste (ie. move) operation, and doing so within the same step, apply in one command
						if (copiedEffectInfo.stepID == step.id && copiedEffectInfo.asCut) {
							const newEffects = Clone(step.extras?.effects ?? []) as TimelineStepEffect[];
							newEffects.Move(newEffects[copiedEffectInfo.effectIndex], effectIndex + 1);
							await RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
						} else {
							// else, start by adding the effect to the target step
							const newEffects = Clone(step.extras?.effects ?? []) as TimelineStepEffect[];
							newEffects.Insert(effectIndex + 1, copiedEffectInfo.effectData);
							await RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});

							// then, if the effect was cut, remove it from the source step
							if (copiedEffectInfo.asCut && copiedEffectInfo_step) {
								const newEffects_source = Clone(copiedEffectInfo_step.extras?.effects ?? []) as TimelineStepEffect[];
								// only remove entry from source step if that slot's data still matches that at time of copy
								if (DeepEquals(newEffects_source[copiedEffectInfo.effectIndex], copiedEffectInfo.effectData)) {
									newEffects_source.RemoveAt(copiedEffectInfo.effectIndex);
									await RunCommand_UpdateTimelineStep({id: copiedEffectInfo_step.id, updates: {extras: {...copiedEffectInfo_step.extras, effects: newEffects_source}}});
								}
							}
						}

						// if the source effect was "cut", clear the step-effect "clipboard", since the cut->paste operation has now been completed
						if (copiedEffectInfo.asCut) {
							RunInAction_Set(this, ()=>store.main.timelines.copiedNodeEffectInfo = null);
						}
					}}/>}
				{effect != null && <VMenuItem text="Move up" style={liveSkin.Style_VMenuItem()}
					onClick={e=>{
						const newEffects = Clone(step.extras?.effects ?? []) as TimelineStepEffect[];
						newEffects.Move(newEffects[effectIndex], effectIndex - 1);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
					}}/>}
				{effect != null && <VMenuItem text="Move down" style={liveSkin.Style_VMenuItem()}
					onClick={e=>{
						const newEffects = Clone(step.extras?.effects ?? []) as TimelineStepEffect[];
						newEffects.Move(newEffects[effectIndex], effectIndex + 1);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
					}}/>}
			</>
		);
	}
}