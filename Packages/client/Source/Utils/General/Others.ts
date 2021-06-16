import {ModifyString} from "web-vcore/nm/js-vextensions";

export function PropNameToTitle(propName: string) {
	return ModifyString(propName, m=>[m.lowerUpper_to_lowerSpaceLower, m.startLower_to_upper]);
}

/*export function EnumNameToDisplayName(enumName: string) {
	return ModifyString(enumName, m=>[m.lowerUpper_to_lowerSpaceLower, m.startLower_to_upper]);
	/*let result = enumName;
	result = result.replace(/[a-z][A-Z]+/g, match=>{
		let result = `${match[0]} `;
		if (match.length == 2) {
			result += match[1].toLowerCase();
		} else {
			result += match.slice(1);
		}
		return result;
	});
	return result;*#/
}*/

// todo: get this working (normally we'll use migrations, but there still will sometimes be a use for this)
/* export function ClearBranchOfStore(path?: string) {
	const oldValue = DeepGet(State(), path);
	Log(`Clearing branch of store. @Branch(${path}) @OldValue:`, oldValue);
	if (path) {
		// DeepSet(State(), path, null);
		const parent = DeepGet(State(), SlicePath(path, 1));
		if (parent) {
			delete parent[path.split('/').Last()];
		}
	} else {
		Log('No path supplied, so just persisting current store state.');
	}
	store.dispatch({ type: 'EmptyAction' }); // dispatch action, to have mutation persisted
} */