import {RunCommand_UpdateTimelineStep} from "Utils/DB/Command";
import chroma from "chroma-js";
import {Map, TimelineStep} from "dm_common";
import {TimelineStepEffect} from "dm_common/Source/DB/timelineSteps/@TimelineStepEffect";
import {Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";

@Observer
export class StepEffectUI extends BaseComponentPlus({} as {map: Map, step: TimelineStep, effect: TimelineStepEffect, index: number}, {detailsOpen: false}) {
	render() {
		const {map, step, effect, index} = this.props;
		const {detailsOpen} = this.state;

		const backgroundColor = chroma("rgba(217,212,122,.8)");
		return (
			<>
				<Row key={index} sel mt={5}
					style={E(
						{width: "100%", padding: 3, background: backgroundColor.css(), borderRadius: 5, cursor: "pointer", border: "1px solid rgba(0,0,0,.5)"},
					)}
					onClick={()=>this.SetState({detailsOpen: !detailsOpen})}
				>
					<span style={{position: "relative", paddingTop: 2, fontSize: 12, color: "rgba(20,20,20,1)"}}>
						{/*<span style={{
							position: "absolute", left: -5, top: -8, lineHeight: "11px", fontSize: 10, color: "yellow",
							background: "rgba(50,50,50,1)", borderRadius: 5, padding: "0 3px",
						}}>
						</span>*/}
						{effect.setTimeTrackerState == true && "Set time-tracker state: visible"}
						{effect.setTimeTrackerState == false && "Set time-tracker state: hidden"}
					</span>
					<Button ml="auto" mdIcon="delete" style={{margin: -3, padding: "3px 10px"}} onClick={()=>{
						const newEffects = (step.extras?.effects ?? []).Exclude(effect);
						RunCommand_UpdateTimelineStep({id: step.id, updates: {extras: {...step.extras, effects: newEffects}}});
					}}/>
				</Row>
				{detailsOpen &&
				<Column sel mt={5}>
				</Column>}
			</>
		);
	}
}