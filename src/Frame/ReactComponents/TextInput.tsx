import {Assert} from "../../Frame/General/Assert";
import * as React from "react";
import {BaseComponent} from "../UI/ReactGlobals";

export default class TextInput extends BaseComponent<{value, onChange, delayChangeTillDefocus?, style?}, {editedValue}> {
	render() {
		var {value, onChange, delayChangeTillDefocus, style} = this.props;
		var {editedValue} = this.state;
		return (
			<input type="text" style={style}
				value={editedValue != null ? editedValue : value} onChange={e=> {
					var newVal = $(e.target).val();
					if (delayChangeTillDefocus) {
						this.setState({editedValue: newVal});
					} else {
						onChange(newVal, e)
					}
				}}
				onBlur={e=> {
					if (!delayChangeTillDefocus) return;
					var newVal = $(e.target).val();
					onChange(newVal, e);
					this.setState({editedValue: null});
				}}/>
		);
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