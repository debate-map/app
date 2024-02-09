import {E} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown, PageContainer} from "web-vcore";
import {Row} from "web-vcore/nm/react-vcomponents.js";
import React, {useEffect} from "react";
import {MapListUI} from "UI/Debates.js";
import {SLMode_2020, SLMode_AI, SLMode_COVID, SLMode_Climate, SLMode_GAD, SLMode_IA, SLMode_Main} from "./SL.js";

export class HomeUI2_SL extends BaseComponent<{}, {}> {
	render() {
		if (SLMode_Main) return <HomeUI2_SLMain/>;
		if (SLMode_GAD) return <HomeUI2_SLGAD/>;
		if (SLMode_COVID) return <HomeUI2_SLCovid/>;
		if (SLMode_2020) return <HomeUI2_SL2020/>;
		if (SLMode_AI) return <HomeUI2_SLAI/>;
		if (SLMode_IA) return null; // not needed atm
		if (SLMode_Climate) return null; // not needed atm
		return null;
	}
}

// generic version (main)
export class HomeUI2_SLMain extends BaseComponent<{}, {}> {
	render() {
		const pageText = `
			Welcome to the Society Library Open Debate Maps. Here you can make and model your own structured debate graph.

			There are many functionalities, such as adding pro/con true and pro/con relevance nodes, question nodes, position nodes, and you can add references (and evidence), quotes, equations, media, various phrases, definitions, and tags to each node.
			
			Although this looks like an argument graph, it is actually a knowledge graph, as nodes can be linked across the database.
			
			Unfortunately, we're not able to provide more thorough instructions on how to use our Debate Maps at this time, especially if you are following our ontological structuring standards. However we hope to in the future.
			
			If you find this tool difficult to use, we apologize, it is usually used by trained staff and contractors who are overseen by expert users.
			
			However, we have taught many students across the country to use this tool, so hopefully you can also figure it out! Thank you for your interest in using this tool.
		`.AsMultiline(0);
		return (
			<PageContainer scrollable={true} style={{flex: null, margin: 0, justifyContent: "center"}} innerStyle={{flex: "0 1 865px", borderRadius: 0, background: null, padding: 0}}>
				<Row style={{margin: "50px 10px 20px 10px", boxSizing: "border-box"}}>
					<article style={{
						flex: "0 0 55%", padding: "180px 50px 40px 50px",
						fontFamily: "'Cinzel', serif", fontVariant: "small-caps", color: "#eee", textAlign: "justify", fontSize: 17,
						backgroundColor: "#1C3749", backgroundImage: "url(/Images/@SL/Main/Home_LeftBox.png)", backgroundPosition: "center 80px", backgroundSize: "100%", backgroundRepeat: "no-repeat",
					}}>
						<VReactMarkdown source={pageText} className='selectable'/>
					</article>
					<div style={{
						flex: "0 0 45%", backgroundImage: "url(/Images/@SL/Main/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat",
					}}/>
				</Row>
				<MapListUI/>
			</PageContainer>
		);
	}
}

// gad/nuclear version (note: "gad" tag was originally used for climate-change maps, iirc)
export class HomeUI2_SLGAD extends BaseComponent<{}, {}> {
	render() {
		const pageText = `
			The Society Library is committed to scaling up societal communications, so we can debate nation-wide, and literally see all available positions to take on a given issue.
			
			This work entails mapping out the arguments, claims, and evidence that we source from various forms of media in order to represent all sides of a given social debate.
			
			Through our partnerships, we have combined our research methods with this debate mapping technology to create a demo of that framework.
			
			This framework serves as the base from which we will create visualizations and interfaces so that the american public can explore these issues, the various points of view on the issues, and examine the evidence themselves.
			
			These arguments, claims, and evidence have been sourced from various forms of media.
		`.AsMultiline(0);
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
						backgroundColor: "#1C3749", backgroundImage: "url(/Images/@SL/GAD/Home_LeftBox_Transparent.png)", backgroundPosition: "center 80px", backgroundSize: "100%", backgroundRepeat: "no-repeat",
						//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
					}}>
						<VReactMarkdown source={pageText} className='selectable'/>
					</article>
					<div style={{
						flex: "0 0 45%", backgroundImage: "url(/Images/@SL/GAD/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat",
						//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
					}}/>
				</Row>
			</PageContainer>
		);
	}
}

// covid version
export class HomeUI2_SLCovid extends BaseComponent<{}, {}> {
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
						backgroundImage: "url(/Images/@SL/COVID/Home_RightBox.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat",
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
export class HomeUI2_SL2020 extends BaseComponent<{}, {}> {
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
					<div style={{width: 960, height: 700, backgroundImage: "url(/Images/@SL/2020/2020ElectionDemo_HomePage.png)", backgroundPosition: "center center", backgroundSize: "100%", backgroundRepeat: "no-repeat"}}/>
				</Row>
			</PageContainer>
		);
	}
}

// 2023+ ai-related version
export class HomeUI2_SLAI extends BaseComponent<{}, {}> {
	render() {
		return (
			<PageContainer style={{margin: "20px auto 20px auto", padding: 0, background: null}}>
				<Row sel style={{marginTop: 30, marginBottom: 20, padding: 10, background: "rgba(0,0,0,.2)", borderRadius: 10}}>
					In an effort to better understand the complex AI/AGI discussion, this joint intelligence project aims to systematically map out the ongoing debates. Our objective is to improve understanding and awareness of these multi-layered conversations, encouraging active risk evaluation and collaborative problem-solving. By gathering arguments, claims, and supporting evidence from various online and global sources, we create visual debate graphs. To explore these detailed diagrams, click on the title and expand each node by clicking the "+" symbol. If you'd like to join this intellectual endeavor, please contact Contact@SocietyLibrary.com. We pursue this work with a genuine interest in truth and employ several de-biasing techniques to minimize our blindspots as much as possible. Thank you for reading.
				</Row>
				<MapListUI/>
			</PageContainer>
		);
	}
}