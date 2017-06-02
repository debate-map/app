import {Component} from "react" // eslint-disable-line
import {BaseComponent, BaseProps} from "../Frame/UI/ReactGlobals";
//import {Component as BaseComponent} from "react";
import VReactMarkdown from "../Frame/ReactComponents/VReactMarkdown";
import SubNavBar from "./@Shared/SubNavBar";
import {SubNavBarButton} from "./@Shared/SubNavBar";
import HomeUI2 from "./Home/Home";
import AboutUI from "./Home/About";
import ScrollView from "react-vscrollview";
import Column from "../Frame/ReactComponents/Column";
import Switch from "Frame/ReactComponents/Switch";
import {Connect} from "../Frame/Database/FirebaseConnect";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.home.subpage),
}))
export default class HomeUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "home";
		return (
			<Column style={{height: "100%"}}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="home" text="Home"/>
					<SubNavBarButton {...{page}} subpage="about" text="About"/>
				</SubNavBar>
				<ScrollView id="HomeScrollView" style={{flex: `1 1 100%`}} scrollVBarStyle={{width: 10}}>
					<Switch>
						{currentSubpage == "about" && <AboutUI/>}
						<HomeUI2/>
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}