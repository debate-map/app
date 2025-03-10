import {BaseComponent} from "react-vextensions";
import React from "react";

import RCSlider from "rc-slider";
/*type RCSlider_Type = import("rc-slider");
const RCSlider = require("rc-slider");*/

export class Slider extends BaseComponent
		<{
			min: number, max: number, step?: number, value: number, enabled?: boolean, instant?: boolean, onChange: (val: number)=>void,
			minimumTrackStyle?, trackStyle?, handleStyle?,
		},
		{editedValue: number|null}> {
	static defaultProps = {enabled: true};
	slider: typeof RCSlider;
	render() {
		const {value, enabled, instant, onChange, ...rest} = this.props;
		const {editedValue} = this.state;
		return (
			<RCSlider ref={c=>this.slider = c as any} {...rest} disabled={!enabled}
				value={editedValue != null ? editedValue : (value || 0)}
				onChange={(val: number)=>{
					if (!instant) {
						this.SetState({editedValue: val});
					} else {
						onChange(val);
						this.SetState({editedValue: null});
					}
				}}
				onChangeComplete={(val: number)=>{
					if (!instant && onChange) {
						onChange(val);
						this.SetState({editedValue: null});
					}
				}}/>
		);
	}
}

//export {Range} from "rc-slider";

export class Range extends BaseComponent
		<{
			min: number, max: number, step?: number, value: number[], enabled?: boolean, instant?: boolean, onChange: (val: number[])=>void,
			minimumTrackStyle?, trackStyle?, handleStyle?,
		},
		{editedValue: number[]|null}> {
	static defaultProps = {enabled: true};
	slider: typeof RCSlider;
	render() {
		const {value, enabled, instant, onChange, ...rest} = this.props;
		const {editedValue} = this.state;
		return (
			<RCSlider range ref={c=>this.slider = c as any} {...rest} disabled={!enabled}
				value={editedValue != null ? editedValue : (value || 0)}
				onChange={(val: number[])=>{
					if (!instant) {
						this.SetState({editedValue: val});
					} else {
						onChange(val);
						this.SetState({editedValue: null});
					}
				}}
				onAfterChange={(val: number[])=>{
					if (!instant && onChange) {
						onChange(val);
						this.SetState({editedValue: null});
					}
				}}/>
		);
	}
}