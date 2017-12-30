import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import {Div} from "react-vcomponents";

export default class GuideUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Guide page is under development.
			</Div>
		);
	}
}