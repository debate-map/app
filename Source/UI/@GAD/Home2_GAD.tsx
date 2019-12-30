import {E} from "js-vextensions";
import {BaseComponent} from "react-vextensions";
import {VReactMarkdown, PageContainer} from "vwebapp-framework";
import {Row} from "react-vcomponents";
import {styles} from "../../Utils/UI/GlobalStyles";

const pageText = `
The Great American Debate is committed to scaling up societal communications, so we can debate nation-wide, and literally see all available positions to take on a given issue.

This work entails mapping out the arguments, claims, and evidence that we source from various forms of media in order to represent all sides of a given social debate.

Through our partnerships, we have combined our research methods with this debate mapping technology to create a demo of that framework.

This framework serves as the base from which we will create visualizations and interfaces so that the american public can explore these issues, the various points of view on the issues, and examine the evidence themselves.

These arguments, claims, and evidence have been sourced from various forms of media.
`;

export class HomeUI2_GAD extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true} style={{flex: null, margin: 0, justifyContent: "center"}} innerStyle={{flex: "0 1 865px", padding: 0, borderRadius: 0, background: null}}>
				<Row style={{margin: "50px 10px 20px 10px"}}>
					<article style={{
						flex: "0 0 55%", padding: "180px 50px 40px 50px",
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", color: "#eee", textAlign: "justify", fontSize: 17,
						backgroundColor: "#1C3749", backgroundImage: "url(/Images/@GAD/Home_LeftBox_Transparent.png)", backgroundPosition: "center 80px", backgroundSize: "100%", backgroundRepeat: "no-repeat"}}>
						<VReactMarkdown source={pageText} className='selectable'/>
					</article>
					<div style={{flex: "0 0 45%", backgroundImage: "url(/Images/@GAD/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat"}}/>
				</Row>
			</PageContainer>
		);
	}
}