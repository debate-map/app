import {ScrollView} from "web-vcore/nm/react-vscrollview.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown_Remarkable, PageContainer} from "web-vcore";

const pageText = `
The Social page is under development.

In the meantime, here are links to our social media and development pages:
`;

export class SocialUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}>
				<article className="selectableAC">
					{/* <VReactMarkdown className="selectable" source={pageText}/> */}
					<VReactMarkdown_Remarkable source={pageText}/>
				</article>
			</PageContainer>
		);
	}
}