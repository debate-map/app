import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Div} from "react-vcomponents";

export default class StreamUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Stream page is under development.
			</Div>
		);
	}
}