import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";

export default class ProfileUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Profile page is under development.
			</Div>
		);
	}
}