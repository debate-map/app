import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import {Route, Switch} from "react-router-dom";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import ScrollView from "react-vscrollview";
import TermsUI from "./Content/TermsUI";
import ImagesUI from "./Content/ImagesUI";

export default class ContentUI extends BaseComponent<{}, {}> {
	render() {
		//let {page, match: {url: path} = {} as any} = this.props;
		let path = "/content";
		return (
			<div style={{height: "100%", display: "flex", flexDirection: "column"}}>
				<SubNavBar>
					<SubNavBarButton to={`${path}/`} toImplied={`${path}/terms`} text="Terms"/>
					<SubNavBarButton to={`${path}/images`} text="Images"/>
				</SubNavBar>
				<Switch>
					<Route path={`${path}/images`} component={ImagesUI}/>
					<Route component={TermsUI}/>
				</Switch>
			</div>
		);
	}
}