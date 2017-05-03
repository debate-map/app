import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";

export default class TermsUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<article>
				TODO
			</article>
		);
	}
}