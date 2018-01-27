import {Polarity} from "../../../../../Store/firebase/nodes/@MapNode";
import {BaseComponent} from "react-vextensions";
import {Button} from "react-vcomponents";

export class AddArgumentButton extends BaseComponent<{polarity: Polarity}, {}> {
	render() {
		let {polarity} = this.props;
		return (
			<Button text={`Add ${Polarity[polarity].toLowerCase()} argument`} onClick={()=> {
				// todo
			}}/>
		);
	}
}