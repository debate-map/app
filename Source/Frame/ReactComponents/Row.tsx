import {Assert} from "../General/Assert";
import {BaseComponent, ApplyBasicStyles} from "../UI/ReactGlobals";
import {E} from "../General/Globals_Free";

/*export default class Row extends BaseComponent<any, any> {
	render() {
		var {style, height, children, ...otherProps} = this.props;
		height = height != null ? height : (style||{}).height;
		return (
			<div {...otherProps} style={E(BasicStyles(this.props), style,
					//height != null ? {height} : {flex: 1})}>
					height != null && {height})}>
				{children}
			</div>
		);
	}
}
@ApplyBasicStyles
export class RowLR extends BaseComponent<{height?, className?, rowStyle?, leftStyle?, rightStyle?}, {}> {
    render() {
		var {height, className, rowStyle, leftStyle, rightStyle, children} = this.props;
        Assert((children as any).length == 2, "Row child-count must be 2. (one for left-side, one for right-side)");
		return (
			<div className={"row3 clear " + (className || "")} style={E(height != null && {height}, rowStyle)}>
				<div style={E({float: "left", width: "50%"}, leftStyle)}>
					{children[0]}
				</div>
				<div style={E({float: "right", width: "50%"}, rightStyle)}>
					{children[1]}
				</div>
			</div>
        );
    }
}*/

@ApplyBasicStyles
export default class Row extends BaseComponent<{style?} & React.HTMLProps<HTMLDivElement>, {}> {
	render() {
		let {style, ...rest} = this.props;
		return <div {...rest} style={E({display: "flex", alignItems: "center"}, style)}/>
	}
}
@ApplyBasicStyles
export class RowLR extends BaseComponent<{splitAt?: number | string, height?: number, className?: string, style?, leftStyle?, rightStyle?} & React.HTMLProps<HTMLDivElement>, {}> {
	static defaultProps = {splitAt: "50%"};
	render() {
		var {splitAt, height, className, style, leftStyle, rightStyle, children, ...rest} = this.props;
		Assert((children as any).length == 2, "Row child-count must be 2. (one for left-side, one for right-side)");
		return (
			<div {...rest} style={E({display: "flex"}, style)}>
				<div style={E(
					{display: "flex", alignItems: "center"},
					{width: typeof splitAt == "string" ? splitAt + "%" : splitAt},
					leftStyle
				)}>
					{children[0]}
				</div>
				<div style={E(
					{display: "flex", alignItems: "center"},
					{width: typeof splitAt == "string" ? (100 - splitAt.slice(0, -1).ToInt()) + "%" : `calc(100% - ${splitAt}px)`},
					rightStyle
				)}>
					{children[1]}
				</div>
			</div>
		);
	}
}