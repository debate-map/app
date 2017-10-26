import {BaseComponent} from "../UI/ReactGlobals";
import {E} from "../../Frame/General/Globals_Free";
import TextAreaAutoSize from "react-textarea-autosize";

var styles = {
	root: {
		margin: 0,
		/*border: "1px solid #A9A9A9",*/
		padding: "3 5",
		border: "none",
		//background: "url(/Main/Packages/Images/Tiling/Menu/Menu.png)",
		//color: "#888",
		cursor: "text",
		resize: "none",

		display: "inline-block",
		boxSizing: "border-box",
		whiteSpace: "pre",
		wordWrap: "normal",
		width: "100%",
		//height: "100%",
		/*overflow: "auto",*/
	},
	root_disabled: {
		/*background: "white",*/
		opacity: .7,
		cursor: "default",
	}
};

export default class TextArea extends BaseComponent<{defaultValue?, value?, editable?, className?, style?, onChange?} & React.HTMLProps<HTMLTextAreaElement>, {}> {
	static defaultProps = {
		editable: true
	};
	
	render() {
		var {defaultValue, editable, className, style, onChange, onKeyPress, ...rest} = this.props;
		return <textarea {...rest} ref="root" readOnly={!editable} className={"simpleText selectable " + className} style={E(styles.root, style)}
			defaultValue={defaultValue} onChange={e=>onChange(this.refs.root.value)}/>;
	}
}

export class TextArea_AutoSize extends BaseComponent<{enabled?: boolean, style?, onChange?} & React.HTMLProps<HTMLTextAreaElement>, {}> {
	render() {
		var {enabled, style, onChange, ...rest} = this.props;
		return (
			<TextAreaAutoSize {...rest} ref="root" disabled={enabled == false} style={E({resize: "none"}, style)}
				onChange={e=>onChange(this.refs.root.value)}/>
		);
	}
}