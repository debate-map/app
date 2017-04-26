import {BaseComponent, BaseProps, AddGlobalStyle, basePropFullKeys, ApplyBasicStyles} from "../UI/ReactGlobals";
import Radium from "radium";
import {E} from "../General/Globals_Free";
import {ToJSON} from "../General/Globals";
import {createMarkupForStyles} from "react/lib/CSSPropertyOperations";
import {Log} from "../General/Logging";

var styles = {
	root: {
		//display: "inline-block",
		display: "inline-flex",
		alignItems: "center",
    	justifyContent: "center",

		//backgroundColor: "rgba(0,0,0,.3)",
		backgroundColor: "rgba(90,100,110,.6)",
		//backgroundColor: "rgba(10,10,10,1)",
		backgroundRepeat: "no-repeat",
		boxShadow: "rgba(210,210,230,1) 0px 0px 3px",
		//boxShadow: "rgba(150,150,150,1) 0px 0px 1px",
		borderRadius: 5,
		/*border: "1px solid rgba(255,255,255,.5)",
		borderWidth: "0 0",*/
		color: "#AAA",
		/*fontFamily: "fancyFontSemibold, Trebuchet MS, Tahoma, sans-serif",*/
		fontSize: 14, textAlign: "center",
		cursor: "pointer",
		":hover": {
			//backgroundColor: "rgba(0,0,0,.7)"
			backgroundColor: "rgba(90,100,110,.8)",
			//backgroundColor: "rgba(20,20,20,1)",
		},
	},
	root_opacityHover: {
		opacity: .6,
		":hover": {
			opacity: 1,
		}
	},
	root_hasCheckbox: {paddingTop: 4, verticalAlign: 1},
	root_disabled: {
	    opacity: .5, cursor: "default", pointerEvents: "none",
		//":hover": {backgroundColor: "rgba(0,0,0,.3)"}
	},
	checkbox: {marginLeft: -6},
};

/*AddGlobalStyle(`
.Button:hover { background-color: rgba(90,100,110,.8) !important; }
`);*/
let pseudoSelectorStyleKeys = {};

//@Radium
@ApplyBasicStyles
export default class Button extends BaseComponent
		<{enabled?: boolean, text?: string, title?: string, className?: string, style?,
			size?: number, width?: number, height?: number, iconSize?: number, iconPath?: string, useOpacityForHover?: boolean,
			hasCheckbox?: boolean, checked?: boolean, checkboxStyle?, checkboxLabelStyle?, onCheckedChanged?,
			onClick?, onLeftClick?, onDirectClick?} & React.HTMLProps<HTMLDivElement>,
		{}> {
	static defaultProps = {enabled: true};
	
	render() {
	    var {enabled, text, title, className, style, size, width, height, iconSize, iconPath, useOpacityForHover,
			hasCheckbox, checked, checkboxStyle, checkboxLabelStyle, onCheckedChanged, children,
			onLeftClick, ...rest} = this.props;

		width = width || size;
		height = height || size;

		var padding = "5px 15px";
		if (height) {
			var baseHeight = 20;
			var heightDifPerSide = (height - baseHeight) / 2;
			padding = (`${heightDifPerSide}px 15px`);
		}
		
		let finalStyle = E(
			styles.root,
			useOpacityForHover && styles.root_opacityHover,
			{padding},
			(width || height) && {
				padding: 0, width, height,
				backgroundPosition: `${(width - iconSize) / 2}px ${(height - iconSize) / 2}px`,
				backgroundSize: iconSize
			},
			iconPath && {backgroundImage: `url(${iconPath})`},
			hasCheckbox && styles.root_hasCheckbox,
			!enabled && styles.root_disabled,
			style,
		);

		// experimental pseudo-selector-capable styling system
		let pseudoSelectors = [":hover"];
		let currentPseudoSelectorStyleKeys = [];
		for (let selector of pseudoSelectors) {
			if (finalStyle[selector] == null) continue;
			let styleText = createMarkupForStyles(finalStyle[selector]);

			var styleKey = ToJSON(selector + "---" + styleText); // get a unique identifier for this particular pseudo-style
			styleKey = styleKey.replace(/[^a-zA-Z0-9-]/g, ""); // make sure key is a valid class-name
			currentPseudoSelectorStyleKeys.push(styleKey);

			// if <style> element for the given style-composite has not been created yet, create it 
			if (pseudoSelectorStyleKeys[styleKey] == null) {
				pseudoSelectorStyleKeys[styleKey] = true;
				AddGlobalStyle(`
		.Button.${styleKey}${selector} {
			${styleText.replace(/([^ ]+?);/g, "$1 !important;")}
		}
						`);
			}
		}

	    return (
			<div {...rest} title={title} onClick={this.OnClick}
					className={`Button ${currentPseudoSelectorStyleKeys.join(" ")} ${className || ""}`}
					style={finalStyle}>
				{/*hasCheckbox && <CheckBox checked={checked} style={E(styles.checkbox, checkboxStyle)} labelStyle={checkboxLabelStyle}
					onChange={checked=>onCheckedChanged && onCheckedChanged(checked)}/>*/}
				{hasCheckbox
					? <span style={{verticalAlign: 4}}>{text}</span>
					: text}
				{children}
			</div>
		);
	}
	OnClick(e) {
	    var {onClick, onLeftClick, onDirectClick} = this.props;
	    if (onDirectClick && (e.target == e.currentTarget || $(e.target).parent()[0] == e.currentTarget))
	        onDirectClick(e);
	    if (onClick)
	        onClick(e);
		if (onLeftClick && e.button == 0)
			onLeftClick(e);
	}
}