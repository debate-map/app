import {BaseComponent} from "../UI/ReactGlobals";
import {E} from "../General/Globals";

export default class Spinner extends BaseComponent
		<{step?, min?, max?, value?, enabled?, title?, style?, onChange, onFocus?}, {}> {
	static defaultProps = {step: 1, min: 0, max: Number.MAX_SAFE_INTEGER, value: 0, enabled: true};
	render() {
	    var {step, min, max, value, enabled, title, style, onChange, onFocus} = this.props;
	    return (
			<input ref="root" type="number" step={step} min={min} max={max} value={value} disabled={!enabled}
				title={title} style={E({color: "#000"}, style)}
				onChange={this.OnChange} onFocus={onFocus}/>
		);
	}
	value;
	OnChange(e) {
		var {onChange} = this.props;
	    this.value = this.refs.root.value;
	    if (onChange) onChange(parseFloat(this.value), e);
	}
}

/*export class Spinner_Auto extends BaseComponent
		<{step?, min?, max?, enabled?, title?, style?, onFocus?,
			path: ()=>any, onChange?: (val: number)=>void}, {}> {
	static defaultProps = {step: 1, min: 0, max: Number.MAX_SAFE_INTEGER};

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
			<Spinner {...rest} value={node[propName]} onChange={val=> {
				node.a(propName).set = val;
				if (onChange) onChange(val);
			}}/>
		);
	}
}*/