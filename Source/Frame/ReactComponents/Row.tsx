import {Assert} from "../General/Assert";
import {BaseComponent, BasicStyles} from "../UI/ReactGlobals";
import {E} from "../General/Globals_Free";

export default class Row extends BaseComponent<any, any> {
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
export class RowLR extends BaseComponent<{height?, className?, rowStyle?, leftStyle?, rightStyle?}, {}> {
    render() {
		var {height, className, rowStyle, leftStyle, rightStyle, children} = this.props;
        Assert((children as any).length == 2, "Row child-count must be 2. (one for left-side, one for right-side)");
		return (
			<div className={"row3 clear " + className} style={E({}, BasicStyles(this.props), height != null && {height}, rowStyle)}>
				<div style={E({float: "left", width: "50%"}, leftStyle)}>
					{children[0]}
				</div>
				<div style={E({float: "right", width: "50%"}, rightStyle)}>
					{children[1]}
				</div>
			</div>
        );
    }
}