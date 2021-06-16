/*import {BaseComponent} from "react-vextensions";
import {Pre, Button, ButtonProps} from "react-vcomponents";

export class RenderDelayer extends BaseComponent<{delay: boolean}, {}> {
	lastResult: JSX.Element;
	render() {
		let {delay, children} = this.props;
		if (delay) return this.lastResult;

		let result = (
			<div className="clickThrough">
				{children}
			</div>
		);
		this.lastResult = result;
		return result;
	}
}*/