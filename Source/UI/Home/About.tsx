import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";

let pageText = `
About page is under development.
`;

@SimpleShouldUpdate
export default class AboutUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<VReactMarkdown className="selectable" source={pageText}
				containerProps={{style: styles.page}}
				renderers={{
					Text: props=> {
						return <span style={{color: "rgba(255,255,255,.7)"}}>{props.literal}</span>;
					}
				}}
			/>
		);
	}
}