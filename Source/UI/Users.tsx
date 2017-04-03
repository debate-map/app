import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";

export default class UsersUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Users page is under development.
			</Div>
		);
	}
}