import {navBarHeight} from "UI/@Shared/NavBar";
import {E} from "js-vextensions";
import {BaseComponent} from "react-vextensions";
import {subNavBarHeight} from "web-vcore";
import {TextArea} from "web-vcore/.yalc/react-vcomponents";

export const GetMaxSafeDialogContentHeight = ()=>window.innerHeight - navBarHeight - subNavBarHeight - 100;

/** Not actually a <textarea/> element, but mimics it. Useful in cases where you want auto-sizing for both width and height. */
export class TextArea_Div extends BaseComponent<{value: string} & React.ComponentProps<typeof TextArea>, {}> {
	render() {
		const {value, className, style, ...rest} = this.props;
		return (
			<div {...rest}
				className={[className, "selectable"].filter(a=>a).join(" ")}
				style={E({
					padding: 2, background: "white", border: "1px solid rgba(0,0,0,.5)",
					whiteSpace: "pre-wrap",
				}, style)}
			>
				{value}
			</div>
		);
	}
}