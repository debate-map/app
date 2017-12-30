import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Div} from "react-vcomponents";

export default class ChatUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Chat page is under development.
			</Div>
		);
	}
}