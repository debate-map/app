import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import VReactMarkdown_Remarkable from "../Frame/ReactComponents/VReactMarkdown_Remarkable";

let pageText = `
The Feedback page is under development.
`;

export class FeedbackUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<article className="selectableAC" style={styles.page}>
				{/*<VReactMarkdown className="selectable" source={pageText} containerProps={{style: styles.page}}/>*/}
				<VReactMarkdown_Remarkable source={pageText}/>
			</article>
		);
	}
}