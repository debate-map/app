import {BaseComponent} from "react-vextensions";
//import "rc-tooltip/assets/bootstrap.css";

export class InTooltip extends BaseComponent<{}, {}> {
	render() {
		let {children} = this.props;
		return (
			<div style={{whiteSpace: "pre"}}>
				{children}
			</div>
		)
	}
}