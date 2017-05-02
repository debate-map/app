import {BaseComponent} from "../UI/ReactGlobals";

export default class CheckBox extends BaseComponent<{text?, title?, checked, style?, labelStyle?, onChange?: (val: boolean)=>void}, {}> {
	static lastID = -1;
	
    constructor(props) {
        super(props);
        this.id = ++CheckBox.lastID;
    }

	id;
	input: HTMLInputElement;
	render() {
		var {text, title, checked, style, labelStyle, onChange} = this.props;
	    return (
			/*<div style={E({display: "inline-block", position: "relative"}, style)}>
				<input ref={c=>this.input = c} id={"checkBox_" + this.id} type="checkbox" checked={checked}
					onChange={e=>onChange && onChange(this.input.checked)}/>
				<label htmlFor={"checkBox_" + this.id} title={title} style={E({marginTop: 3}, labelStyle)}><span/>{text}</label>
			</div>*/
			<input ref={c=>this.input = c} type="checkbox" checked={checked}
				onChange={e=>onChange && onChange(this.input.checked)}/>
		);
	}

	get Checked() { return this.input.checked; }
}

/*export class CheckBox_Auto extends BaseComponent<
		{text?, title?, style?, labelStyle?,
			path: ()=>any, onChange?: (val: boolean)=>void}, {}> {
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
			<CheckBox {...rest} checked={node[propName]}
				onChange={val=> {
					node.a(propName).set = val;
					if (onChange) onChange(val);
				}}/>
		);
	}
}*/