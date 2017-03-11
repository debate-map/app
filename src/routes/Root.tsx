import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavbar from "./@Shared/SubNavbar";
import {SubNavBarButton} from "./@Shared/SubNavbar";
//import ScrollView from "react-free-scrollbar";
import {Route} from "react-router-dom";
import HomeUI from "./Root/Home";
import AboutUI from "./Root/About";
var ScrollView = require("react-free-scrollbar").default;

export default class Home extends BaseComponent<{} & BaseProps, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<div style={{height: "100%", display: "flex", flexDirection: "column"}}>
				<SubNavbar>
					<SubNavBarButton to={`${match.url}`} text="Home"/>
					<SubNavBarButton to={`${match.url}about`} text="About"/>
				</SubNavbar>
				<Route path={`${match.url}/home`} component={HomeUI}/>
				<Route path={`${match.url}/about`} component={AboutUI}/>
			</div>
		);
	}
}