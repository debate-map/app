import {BaseComponent} from "../UI/ReactGlobals";
import {ButtonProps} from "./Button";
import Button from "./Button";

export default class InfoButton extends BaseComponent<{text: string} & ButtonProps, {}> {
	render() {
		let {text, ...rest} = this.props;
		return (
			<Button {...rest as any} size={13} iconSize={13} iconPath="/Images/Buttons/Info.png"
				useOpacityForHover={true} style={{position: `relative`, zIndex: 1, marginLeft: 1, backgroundColor: null, boxShadow: null}}
				title={text}/>
		);
	}
}