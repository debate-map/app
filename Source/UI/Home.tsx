import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
import {Route} from "react-router-dom";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import {GetUrlVars, GetUrlPath} from "../Frame/General/Globals_Free";
import ScrollView from "react-vscrollview";

export default class HomeUI extends BaseComponent<{} & BaseProps, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<div style={{height: "100%", display: "flex", flexDirection: "column"}}>
				<SubNavbar>
					<SubNavBarButton to={`/`} text="Home"/>
					<SubNavBarButton to={`/about`} text="About"/>
				</SubNavbar>
				<ScrollView style={{flex: "1 1 100%"}} scrollVBarStyle={{width: 10}}>
					{/*<Route path={`/`} component={HomeUI}/>
					<Route path={`/about`} component={AboutUI}/>*/}
					{GetUrlPath() == "" && <HomeUI2/>}
					{GetUrlPath().startsWith("about") && <AboutUI/>}
				</ScrollView>
			</div>
		);
	}
}