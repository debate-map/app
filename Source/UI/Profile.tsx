import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Div} from "react-vcomponents";

export default class ProfileUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Profile page is under development.
			</Div>
		);
	}
}