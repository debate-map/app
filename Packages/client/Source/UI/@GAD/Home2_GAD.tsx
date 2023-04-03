import {E} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown, PageContainer} from "web-vcore";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import React, {useEffect} from "react";
import {MapListUI} from "UI/Debates.js";
import {GADDemo_2020, GADDemo_AI, GADDemo_COVID, GADDemo_Main} from "./GAD.js";

const pageText = `
The Society Library is committed to scaling up societal communications, so we can debate nation-wide, and literally see all available positions to take on a given issue.

This work entails mapping out the arguments, claims, and evidence that we source from various forms of media in order to represent all sides of a given social debate.

Through our partnerships, we have combined our research methods with this debate mapping technology to create a demo of that framework.

This framework serves as the base from which we will create visualizations and interfaces so that the american public can explore these issues, the various points of view on the issues, and examine the evidence themselves.

These arguments, claims, and evidence have been sourced from various forms of media.
`;

export class HomeUI2_GAD extends BaseComponent<{}, {}> {
	render() {
		if (GADDemo_Main) return <HomeUI2_GADMain/>;
		if (GADDemo_COVID) return <HomeUI2_GADCovid/>;
		if (GADDemo_2020) return <HomeUI2_GAD2020/>;
		if (GADDemo_AI) return <HomeUI2_GADAI/>;
		return null;
	}
}

// climate-change version (main)
export class HomeUI2_GADMain extends BaseComponent<{}, {}> {
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
}

// covid version
export class HomeUI2_GADCovid extends BaseComponent<{}, {}> {
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

// 2023+ ai-related version
export class HomeUI2_GADAI extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer style={{margin: "20px auto 20px auto", padding: 0, background: null}}>
				<Row style={{marginTop: 30, marginBottom: 20, padding: 10, background: "rgba(0,0,0,.2)", borderRadius: 10}}>
					In an effort to better understand the complex AI/AGI discussion, this joint intelligence project aims to systematically map out the ongoing debates. Our objective is to improve understanding and awareness of these multi-layered conversations, encouraging active risk evaluation and collaborative problem-solving. By gathering arguments, claims, and supporting evidence from various online and global sources, we create visual debate graphs. To explore these detailed diagrams, click on the title and expand each node by clicking the "+" symbol. If you'd like to join this intellectual endeavor, please contact Contact@SocietyLibrary.com. We pursue this work with a genuine interest in truth and employ several de-biasing techniques to minimize our blindspots as much as possible. Thank you for reading.
				</Row>
				<MapListUI/>
			</PageContainer>
		);
	}
}