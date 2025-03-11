import {IsString, E} from "js-vextensions";
import {observer} from "mobx-react";
import Moment from "moment";
import React, {useCallback, useState} from "react";
import DateTime_Wrapper, {DatetimepickerProps} from "react-datetime";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";

// fsr, the import is receiving the module wrapper, not the default export; so fix it manually
const DateTime = DateTime_Wrapper["default"] as typeof DateTime_Wrapper;

function RawValToMoment(val: Moment.Moment | string | n, dateFormat: string | false | n, timeFormat: string | false | n): Moment.Moment|null {
	//let timeOnly = props.dateFormat == false;
	//const {dateFormat, timeFormat} = props;

	if (val == null) return null;

	// if string-input did not exactly match dateFormat+timeFormat, this function will try to parse the meaning anyway
	if (IsString(val)) {
		if (val == "" || (dateFormat == false && timeFormat == false)) return null;
		const asMoment = Moment(val);
		//const asMoment = Moment(val, ["HH:mm", "hh:mm a"]);
		/*const asMoment = Moment(val,
			dateFormat && timeFormat ? [`${dateFormat} ${timeFormat}`].concat(dateFo) :
			dateFormat ? [dateFormat] :
			timeFormat ? [timeFormat] :
			null);*/
		if (!asMoment.isValid()) return null;
		return asMoment;
	}

	return val;
}
function KeepInRange(val: Moment.Moment, min: Moment.Moment|n, max: Moment.Moment|n) {
	let result = val;
	if (min != null && result < min) result = min;
	if (max != null && result > max) result = max;
	return result;
}
function MomentOrString_Normalize(momentOrStr_raw: Moment.Moment | string, dateFormat: string | false | n, timeFormat: string | false | n, min: Moment.Moment|n, max: Moment.Moment|n) {
	let result: Moment.Moment|null = null;
	if (momentOrStr_raw) {
		result = RawValToMoment(momentOrStr_raw, dateFormat, timeFormat);
		result = KeepInRange(result!, min, max);
	}
	return result;
}

export type VDateTime_Props = {
	enabled?: boolean, instant?: boolean, min?: Moment.Moment|n, max?: Moment.Moment|n, onChange: (val: Moment.Moment|n)=>void,
	//dateFormatExtras?: string[], timeFormatExtras?: string[],
	// fixes for DatetimepickerProps
	value?: Date | string | Moment.Moment | n, dateFormat?: string | false, timeFormat?: string | false,
} & Omit<DatetimepickerProps, "value" | "onChange" | "dateFormat" | "timeFormat">;
export const VDateTime = observer(({enabled, value, onChange, instant, dateFormat, timeFormat, inputProps, min, max, ...rest}: VDateTime_Props)=>{
	const [editedValue_raw, setEditedValue_raw] = useState<Moment.Moment | string | n>(null);

	if (!enabled) {
		inputProps = E(inputProps, {disabled: true});
	}

	const OnInputBlurOrBoxClose = useCallback((newVal_raw: Moment.Moment | string)=>{
		const newVal = MomentOrString_Normalize(newVal_raw, dateFormat, timeFormat, min, max);
		//if (`${newVal}` == `${value}`) return; // if no change, ignore event
		const valChanged = `${newVal}` != `${value}`; // don't just return if same value; we still need to clear edited-value (in case date-time string needs normalization)

		if (!instant) {
			if (onChange && valChanged) onChange(newVal);
			setEditedValue_raw(null);
		}
	}, [value, dateFormat, timeFormat, min, max, instant, onChange]);

	return (
		<DateTime {...rest} value={editedValue_raw != null ? editedValue_raw : (value ?? undefined)}
			dateFormat={dateFormat} timeFormat={timeFormat}
			onChange={newVal_raw=>{
				const newVal = MomentOrString_Normalize(newVal_raw, dateFormat, timeFormat, min, max);
				if (`${newVal}` == `${RawValToMoment(editedValue_raw, dateFormat, timeFormat)}`) return; // if no change, ignore event

				if (!instant) {
					setEditedValue_raw(newVal_raw);
				} else {
					onChange(newVal);
					setEditedValue_raw(null);
				}
			}}
			inputProps={E({onBlur: e=>OnInputBlurOrBoxClose(e.target.value)}, inputProps)}
			onClose={val=>OnInputBlurOrBoxClose(val as string | Moment.Moment)}/>
	);
});