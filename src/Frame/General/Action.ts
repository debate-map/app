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
}
Object.prototype._AddFunction("Is", Action.prototype.Is);

/*export function IsACT<Props>(action, actionType: new(..._)=>Action<Props>): action is Props {
	return action.type == actionType.name;
	//return action instanceof actionType; // alternative
}*/
/*export function IsACT<T, Props>(action: Action<T>, actionType: new(..._)=>Action<Props>): action is Props {
	return this.type == actionType.name;
		//return this instanceof actionType; // alternative
}*/