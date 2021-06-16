import {E} from "web-vcore/nm/js-vextensions";
import {BaseComponent} from "web-vcore/nm/react-vextensions";
import {VReactMarkdown, PageContainer} from "vwebapp-framework";
import {Row} from "web-vcore/nm/react-vcomponents";
import {useEffect} from "react";
import {styles} from "../../Utils/UI/GlobalStyles";

const pageText = `
The Great American Debate is committed to scaling up societal communications, so we can debate nation-wide, and literally see all available positions to take on a given issue.

This work entails mapping out the arguments, claims, and evidence that we source from various forms of media in order to represent all sides of a given social debate.

Through our partnerships, we have combined our research methods with this debate mapping technology to create a demo of that framework.

This framework serves as the base from which we will create visualizations and interfaces so that the american public can explore these issues, the various points of view on the issues, and examine the evidence themselves.

These arguments, claims, and evidence have been sourced from various forms of media.
`;

// climate-change version
/*export class HomeUI2_GAD extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}
				style={{
					flex: null, margin: 0, justifyContent: "center",
					//filter: null, // remove shadow from full page, so we can apply just to the left-box below
				}}
				innerStyle={{
					flex: "0 1 865px", borderRadius: 0, background: null,
					padding: 0,
					//padding: "0 30px", boxSizing: "content-box", // adds extra space, so we can add internal "filter" without hitting edge-cutoff
				}}
			>
				<Row style={{margin: "50px 10px 20px 10px", boxSizing: "border-box"}}>
					<article style={{
						flex: "0 0 55%", padding: "180px 50px 40px 50px",
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", color: "#eee", textAlign: "justify", fontSize: 17,
						backgroundColor: "#1C3749", backgroundImage: "url(/Images/@GAD/Home_LeftBox_Transparent.png)", backgroundPosition: "center 80px", backgroundSize: "100%", backgroundRepeat: "no-repeat",
						//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
					}}>
						<VReactMarkdown source={pageText} className='selectable'/>
					</article>
					<div style={{
						flex: "0 0 45%", backgroundImage: "url(/Images/@GAD/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat",
						//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
					}}/>
				</Row>
			</PageContainer>
		);
	}
}*/

// covid version
export class HomeUI2_GAD extends BaseComponent<{}, {}> {
	render() {
		useScript("https://sdk.canva.com/v1/embed.js");
		return (
			<PageContainer scrollable={true}
				style={{
					flex: null, margin: 0, justifyContent: "center",
					filter: null, // remove shadow from page
					overflow: "visible",
				}}
				innerStyle={{
					//flex: "0 1 865px",
					borderRadius: 0, background: null,
					padding: 0,
				}}
			>
				<Row style={{margin: "50px 10px 20px 10px", boxSizing: "border-box"}}>
					<div style={{width: 960}}>
						<div className="canva-embed" data-design-id="DAD41nqt9ak" data-height-ratio="0.5625" style={{padding: "56.2500% 5px 5px 5px", background: "rgba(0,0,0,0.03)", borderRadius: 8}}/>
						{/*<script src="https://sdk.canva.com/v1/embed.js"/>
						<a href="https://www.canva.com/design/DAD41nqt9ak/view?utm_content=DAD41nqt9ak&utm_campaign=designshare&utm_medium=embeds&utm_source=link" target="_blank" rel="noopener noreferrer nofollow">
							TheCOVIDConvoV.2
						</a>*/}
					</div>
					<div style={{
						position: "absolute", left: "100%", top: "calc(50% - 200px)", width: 400, height: 400,
						backgroundImage: "url(/Images/@GAD/COVID/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat",
					}}/>
				</Row>
			</PageContainer>
		);
	}
}

const useScript = url=>{
	useEffect(()=>{
		const script = document.createElement("script");
		script.src = url;
		script.async = true;
		document.body.appendChild(script);
		return ()=>{
			document.body.removeChild(script);
		};
	}, [url]);
};

// 2020-election version
export class HomeUI2_GAD2020 extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer scrollable={true}
				style={{
					flex: null, margin: 0, justifyContent: "center",
					filter: null, // remove shadow from page
					overflow: "visible",
				}}
				innerStyle={{
					//flex: "0 1 865px",
					borderRadius: 0, background: null,
					padding: 0,
				}}
			>
				<Row style={{margin: "50px 10px 20px 10px", boxSizing: "border-box"}}>
					<div style={{width: 960, height: 700, backgroundImage: "url(/Images/@GAD/2020ElectionDemo_HomePage.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat"}}/>
				</Row>
			</PageContainer>
		);
	}
}