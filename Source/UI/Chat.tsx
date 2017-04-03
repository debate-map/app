import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";

export default class ChatUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Chat page is under development.
			</Div>
		);
	}
}