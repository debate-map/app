import {RootState} from "../../Store/index";
import u from "updeep";

export var State_overrideData_path: string;
export var State_overrideData_value: any;
export var State_overrideCountAsAccess_value: boolean;

export function StartStateDataOverride(path: string, tempData: any) {
	Assert(State_overrideData_path == null, "Cannot start a state-data-override when one is already active.");
	State_overrideData_path = path;
	State_overrideData_value = tempData;
}
export function UpdateStateDataOverride(updates) {
	Assert(State_overrideData_path != null, "Cannot update a state-data-override when none has been activated yet.");
	for (let {name: path, value} of updates.Props()) {
		State_overrideData_value = u.updateIn(path.replace(/\//g, "."), u.constant(value), State_overrideData_value);
	}
}
export function StopStateDataOverride() {
	State_overrideData_path = null;
	State_overrideData_value = null;
}

export function StartStateCountAsAccessOverride(value: boolean) {
	State_overrideCountAsAccess_value = value;
}
export function StopStateCountAsAccessOverride() {
	State_overrideCountAsAccess_value = null;
}