export default class Action<Props> {
	constructor(props: Props) {
		this.type = this.constructor.name;
		this.props = props;
		this.Extend(props);
		Object.setPrototypeOf(this, Object.getPrototypeOf({}));
	}
	type: string;
	props: Props; // needed for Is() method's type-inference to work, for some reason

	Is<Props2>(actionType: new(..._)=>Action<Props2>): this is Props2 {
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