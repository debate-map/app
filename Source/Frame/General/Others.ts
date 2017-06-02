import {RemoveHelpers} from "../Database/DatabaseHelpers";

export function GetUpdates(oldData, newData, useNullInsteadOfUndefined = true) {
	let result = {};
	for (let key of oldData.VKeys(true).concat(newData.VKeys(true))) {
		if (newData[key] !== oldData[key]) {
			result[key] = newData[key];
			if (newData[key] === undefined && useNullInsteadOfUndefined) {
				result[key] = null;
			}
		}
	}
	return RemoveHelpers(result);
}