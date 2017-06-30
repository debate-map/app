import {Assert} from "../../Frame/General/Assert";
import React from "react";
import {BaseComponent, ApplyBasicStyles} from "../UI/ReactGlobals";
import {E} from "../General/Globals_Free";

@ApplyBasicStyles
export default class TextInput extends BaseComponent
		<{value: string, enabled?: boolean, onChange?: (newVal, event)=>void, delayChangeTillDefocus?: boolean, style?} & React.HTMLProps<HTMLInputElement>,
		{editedValue: string}> {
	static defaultProps = {type: "text"};
	/*ComponentWillReceiveProps(props) {
		// if value changing, and "delayChangeTillDefocus" is not enabled
		if (!props.delayChangeTillDefocus && props.value != this.props.value) {
			this.SetState({editedValue: null});
		}
	}*/
	render() {
		var {value, enabled, onChange, delayChangeTillDefocus, style, ...rest} = this.props;
		var {editedValue} = this.state;
		return (
			<input {...rest} ref="root" disabled={enabled == false} style={E({color: "black"}, style)}
				value={editedValue != null ? editedValue : (value || "")} onChange={e=> {
					var newVal = $(e.target).val();
					if (delayChangeTillDefocus) {
						this.SetState({editedValue: newVal});
					} else {
						onChange(newVal, e);
						this.SetState({editedValue: null});
					}
				}}
				onBlur={e=> {
					if (!delayChangeTillDefocus) return;
					var newVal = $(e.target).val();
					if (onChange) {
						onChange(newVal, e);
						this.SetState({editedValue: null});
					}
				}}/>
		);
	}
	GetValue() {
		return this.refs.root.value;
	}
}

/*export class TextInput_Auto extends BaseComponent<
		{style?, delayChangeTillDefocus?,
			path: ()=>any, onChange?: (val: string)=>void}, {}> {
	ComponentWillMountOrReceiveProps(props) {
		var {path} = props;
		let {node, key: propName} = path();
		this.AddChangeListeners(node,
			(propName + "_PostSet").Func(this.Update),
		);
	}

	render() {
		var {path, onChange, ...rest} = this.props;
		let {node, key: propName} = path();
		return (
			<TextInput {...rest} value={node[propName]} onChange={val=> {
				node.a(propName).set = val;
				if (onChange) onChange(val);
			}}/>
		);
	}
}*/