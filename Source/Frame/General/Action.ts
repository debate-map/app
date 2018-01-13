export default class Action<Payload> {
	constructor(payload: Payload) {
		this.type = this.constructor.name;
		this.payload = payload;
		//this.Extend(payload);
		Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	type: string;
	payload: Payload; // needed for Is() method's type-inference to work, for some reason

	Is<Payload2>(actionType: new(..._)=>Action<Payload2>): this is Action<Payload2> {
		if (actionType == null) return false; // this can occur during start-up "assert reducer sanity" phase
		return this.type == actionType.name;
		//return this instanceof actionType; // alternative
	}
	IsAny(...actionTypes: (new(..._)=>Action<any>)[]) {
		return actionTypes.Any(a=>this.type == a.name);
	}
}
Object.prototype._AddFunction("Is", Action.prototype.Is);
Object.prototype._AddFunction("IsAny", Action.prototype.IsAny);
//Object.prototype._AddFunction("IsACTSetFor", Action.prototype.IsACTSetFor);

/*export function IsACT<Props>(action, actionType: new(..._)=>Action<Props>): action is Props {
	return action.type == actionType.name;
	//return action instanceof actionType; // alternative
}*/
/*export function IsACT<T, Props>(action: Action<T>, actionType: new(..._)=>Action<Props>): action is Props {
	return this.type == actionType.name;
	//return this instanceof actionType; // alternative
}*/

export function IsACTSetFor(action: Action<any>, path: string) {
	if (!action.type.startsWith("ACTSet_")) return false;
	// exact match
	if (action.payload["path"] == path) return true;
	// wildcard match
	if (path.includes("$any")) {
		let pathParts = path.split("/");
		let actionPathParts = action.payload["path"].split("/");
		for (let [index, pathPart] of pathParts.entries()) {
			let matches = pathPart == actionPathParts[index] || pathPart == "$any";
			if (!matches) return false;
		}
		return true;
	}
	return false;
}