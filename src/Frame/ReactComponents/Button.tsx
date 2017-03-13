import {BaseComponent, BasicStyles, BaseProps} from "../UI/ReactGlobals";
import Radium from "radium";
import {E} from "../General/Globals_Free";

var styles = {
	root: {
		display: "inline-block",
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
		fontSize: 14,
		cursor: "pointer",
		":hover": {
			//backgroundColor: "rgba(0,0,0,.7)"
			backgroundColor: "rgba(90,100,110,.8)",
			//backgroundColor: "rgba(20,20,20,1)",
		},
	},
	root_hasCheckbox: {paddingTop: 4, verticalAlign: 1},
	root_disabled: {
	    opacity: .5, cursor: "default", pointerEvents: "none",
		":hover": {backgroundColor: "rgba(0,0,0,.3)"}
	},
	checkbox: {marginLeft: -6},
};

@Radium
export default class Button extends BaseComponent
		<{enabled?: boolean, text?: string, title?: string, className?: string, style?,
			size?, iconSize?, height?,
			hasCheckbox?, checked?, checkboxStyle?, checkboxLabelStyle?, onCheckedChanged?, onClick?, onDirectClick?} & BaseProps,
		{}> {
	static defaultProps = {enabled: true};
	
	render() {
	    var {enabled, text, title, className, style, size, iconSize, height,
			hasCheckbox, checked, checkboxStyle, checkboxLabelStyle, onCheckedChanged} = this.props;
		
		var padding = "5px 15px";
		if (height) {
			var baseHeight = 20;
			var heightDifPerSide = (height - baseHeight) / 2;
			padding = (`${heightDifPerSide}px 15px`);
		}

	    return (
			<div title={title} onClick={this.OnClick}
				className={className}
				style={[
					BasicStyles(this.props),
					styles.root,
					{padding},
					size && {padding: 0, width: size, height: size,
						backgroundPosition: `${(size - iconSize) / 2}px ${(size - iconSize) / 2}px`,
						backgroundSize: iconSize
					},
					hasCheckbox && styles.root_hasCheckbox,
					!enabled && styles.root_disabled,
					style,
				]}>
				{/*hasCheckbox && <CheckBox checked={checked} style={E(styles.checkbox, checkboxStyle)} labelStyle={checkboxLabelStyle}
					onChange={checked=>onCheckedChanged && onCheckedChanged(checked)}/>*/}
				{hasCheckbox
					? <span style={{verticalAlign: 4}}>{text}</span>
					: text}
			</div>
		);
	}
	OnClick(e) {
	    var {onClick, onDirectClick} = this.props;
	    if (onDirectClick && (e.target == e.currentTarget || $(e.target).parent()[0] == e.currentTarget))
	        onDirectClick(e);
	    if (onClick)
	        onClick(e);
	}
}