import {Div, BaseComponent} from "../../Frame/UI/ReactGlobals";
import {styles} from "../../Frame/UI/GlobalStyles";

export default class GlobalListUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				List page is under development.
			</Div>
		);
	}
}