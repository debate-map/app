import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {Route} from "react-router-dom";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import ScrollView from "react-vscrollview";
import {GetPathNodes} from "../Store/router";

export default class HomeUI extends BaseComponent<{}, {}> {
	render() {
		//let {page, match: {url: path} = {} as any} = this.props;
		let path = "", pathImplied = "/home";
		return (
			<div style={{height: "100%", display: "flex", flexDirection: "column"}}>
				<SubNavBar>
					<SubNavBarButton to={path + "/"} toImplied={pathImplied + "/home"} text="Home"/>
					<SubNavBarButton to={path + "/about"} toImplied={pathImplied + "/about"} text="About"/>
				</SubNavBar>
				<ScrollView style={{flex: "1 1 100%"}} scrollVBarStyle={{width: 10}}>
					<Route path={path + "/"} exact={true} component={HomeUI2}/>
					<Route path={path + "/about"} component={AboutUI}/>
				</ScrollView>
			</div>
		);
	}
}