import {IsConstructor} from "../../Frame/General/Types";
import {E} from "../../Frame/General/Globals_Free";
import Radium from "radium";
import autoBind from "react-autobind";
import {Assert} from "../../Frame/General/Assert";
import {BaseComponent, FindDOM} from "../UI/ReactGlobals";
import {Enum} from "../General/Enums";

/*export class Option {
	constructor(name, value, style?) {
		this.name = name;
		this.value = value;
		this.style = style;
	}
	name;
	value;
	style;
}*/

export default class Select extends BaseComponent
		<{options: {name: string, value, style?}[] | {name: string}[] | string[] | any[] | (new()=>Enum) | {[s: string]: any},
			displayType?: "dropdown" | "button bar",
			compareBy?: "name" | "value" | "value toString",
			value, verifyValue?: boolean,
			enabled?: boolean, className?, title?, style?, childStyle?, onChange}, {}> {
	static defaultProps = {
		displayType: "dropdown",
		compareBy: "value",
		verifyValue: true,
	};

	get OptionsList() {
		let {options: options_raw} = this.props;

		let result = [] as {name: string, value, style?}[];
		if (options_raw instanceof Array) {
			for (let option_raw of options_raw) {
				if (option_raw && option_raw instanceof Object && "name" in option_raw && "value" in option_raw) {
					result.push(option_raw);
				} else {
					result.push({name: option_raw["name"] || option_raw.toString(), value: option_raw});
				}
			}
		} else if (IsConstructor(options_raw)) {
			Assert(options_raw.prototype instanceof Enum, "Class provided must derive from class 'Enum'.");
			result = (options_raw as any).options;
		} else {
			let optionsMap = options_raw as any;
			for (let {name, value} of optionsMap.Props()) {
				//result.push(new Option(name, value));
				result.push({name, value});
			}
		}
		return result;
	}
	
	GetIndexOfOption(option) {
		return this.OptionsList.indexOf(option);
	}
	GetIndexOfValue(value) {
		var {compareBy} = this.props;
		var options = this.OptionsList;
		return options.FindIndex((option: any)=> {
			if (compareBy == "name") return option.name === value;
			if (compareBy == "value") return option.value === value;
			return option.value == null ? value == null : option.value.toString() === value.toString();
		});
	}
	//GetIndexForValue(value) { return this.FlattenedChildren.FindIndex(a=>a.props.value == value); }
	GetSelectedOption() {
		Assert(this.props.displayType == "dropdown");
	    var selectedIndex = (FindDOM(this.refs.root) as HTMLSelectElement).selectedIndex;
		return this.OptionsList[selectedIndex];
	}
	GetSelectedValue() {
		return this.GetSelectedOption().value;
	}
	
	render() {
		var {displayType, value, verifyValue, enabled, className, title, style, childStyle, onChange} = this.props;
		var options = this.OptionsList;
		Assert(options.Select(a=>a.name).Distinct().length == options.length, ()=> {
			var optionsWithNonUniqueNames = options.Where(a=>options.VCount(b=>b.name == a.name) > 1);
			return `Select options must have unique names. (shared: ${optionsWithNonUniqueNames.Select(a=>a.name).join(", ")})`;
		});
		let valueValid = this.GetIndexOfValue(value) != -1;
		// if there are no options yet, or value provided is null, don't require match, since this may be a pre-data render
		if (options.length && value != null && verifyValue) {
			AssertWarn((valueValid), `Select's value must match one of the options. @options(${
				options.Select(a=>a.name + ":" + a.value).join(", ")}) @value(${value})`);
		}

	    /*var newChildren = this.FlattenedChildren.map((child: any, index)=> {
			//return React.cloneElement(child, {key: index, index: index});
	        return <Option key={index} index={index} style={child.props.style}>{child.props.children}</Option>;
	    });*/

		if (displayType == "dropdown") {
			return (
				<select ref="root" disabled={enabled == false} value={"value" + this.GetIndexOfValue(value)}
						className={className} title={title} style={E({color: "#000"}, style)} onChange={e=>onChange(this.GetSelectedValue())}>
					{options.map((option, index)=> {
						return <Dropdown_OptionUI key={option.name} index={index} style={E(childStyle, option.style)}>
							{option.name}
						</Dropdown_OptionUI>;
					})}
				</select>
			);
		}
		
		return (
			<div disabled={enabled == false} style={E({/*borderRadius: 4, background: "rgba(255,255,255,.3)"*/}, style)}>
				{options.map((option, index)=> {
					return <ButtonBar_OptionUI key={option.name}
							first={index == 0} last={index == options.length - 1} selected={option.value === value}
							style={E(childStyle, option.style)} onSelect={e=>onChange(option.value)}>
						{option.name}
					</ButtonBar_OptionUI>;
				})}
			</div>
		);
	}
}

export class Dropdown_OptionUI extends BaseComponent<{index, style}, {}> {
	render() {
	    var {index, style, children} = this.props;
	    return (
			<option value={`value${index}`} style={E({color: "#000"}, style)}>
				{children}
			</option>
		);
	}
}

@Radium
export class ButtonBar_OptionUI extends BaseComponent<{first, last, selected, onSelect, style}, {}> {
	// add proxy, since using Radium
	setState(newState?, callback?) {
		return this.SetState(newState, callback) as any;
	}
	render() {
	    var {first, last, selected, style, children, onSelect} = this.props;
	    return (
			<div className="ButtonBar_OptionUI"
					style={E(
						{display: "inline-block", background: "rgba(255,255,255,.3)", padding: "5px 12px",
							cursor: "pointer",
							":hover": {background: "rgba(255,255,255,.5)"}},
						first && {borderRadius: "4px 0 0 4px"},
						!first && {border: "solid #222", borderWidth: "0 0 0 1px"},
						last && {borderRadius: "0 4px 4px 0"},
						first && last && {borderRadius: "4px"},
						selected && {":hover": {}, background: "rgba(255,255,255,.5)"},
						style
					)}
					onClick={onSelect}>
				{children}
			</div>
		);
	}
}

/*export class Select_Auto extends BaseComponent<
		{options: {name: string, value, style?}[] | string[] | (new()=>Enum) | {[s: string]: any},
			displayType?: "dropdown" | "button bar",
			compareBy?: "name" | "value" | "value toString",
			className?, title?, style?, childStyle?,
			path: ()=>any, onChange?: (val)=>void}, {}> {
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
			<Select {...rest} value={node[propName]} onChange={val=> {
				node.a(propName).set = val;
				if (onChange) onChange(val);
			}}/>
		);
	}
}*/