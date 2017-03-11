export default class Action<Payload> {
	constructor(payload: Payload) {
		this.type = this.constructor.name;
		//this.payload = payload;

		if (payload != null) {
			// if payload has "type" prop, alias it, so it doesn't clash with ours
			if ("type" in payload) {
				this["_type"] = payload["type"];
				delete payload["type"];
			}
			this.Extend(payload);
		} /*else {
			this["_isNull"] = true;
		}*/

		Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	type: string;
	payload: Payload; // needed for Is() method's type-inference to work, for some reason

	Is<Payload2>(actionType: new(..._)=>Action<Payload2>): this is Payload2 {
		var result = this.type == actionType.name;
		//var result = this instanceof actionType; // alternative
		
		// if we're about to apply this action to the store
		if (result == true) {
			var oldType = this.type;
			// set up a temp-replacement of the "type" prop, which (only once) provides a copy of the "_type" prop (the payload's original "type" prop)
			Object.defineProperty(this, "type", {configurable: true, get: ()=> {
				//if (this["_isNull"])

				// if payload has/had "type" prop, provide it for this apply-to-tree step (else, provide "null", since we don't want the Action type in the store)
				var result = "_type" in this ? this["_type"] : null;
				delete this.type;
				this.type = oldType;
				return result;
			}});
		}
		
		return result;
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