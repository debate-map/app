import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
import {styles} from "../Frame/UI/GlobalStyles";

export default class ContentUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<Div style={styles.page}>
				Content page is under development.
			</Div>
		);
	}
}