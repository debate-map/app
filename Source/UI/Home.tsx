import { Column, Switch } from "react-vcomponents";
import { BaseComponent } from "react-vextensions";
import { ScrollView } from "react-vscrollview";
import { Connect } from "../Frame/Database/FirebaseConnect";
import SubNavBar, { SubNavBarButton } from "./@Shared/SubNavBar";
import AboutUI from "./Home/About";
import HomeUI2 from "./Home/Home";

type Props = {} & Partial<{currentSubpage: string}>;
@Connect(state=> ({
	currentSubpage: State(a=>a.main.home.subpage),
}))
export class HomeUI extends BaseComponent<Props, {}> {
	render() {
		let {currentSubpage} = this.props;
		let page = "home";
		return (
			<Column style={ES({flex: 1})}>
				<SubNavBar>
					<SubNavBarButton {...{page}} subpage="home" text="Home"/>
					<SubNavBarButton {...{page}} subpage="about" text="About"/>
				</SubNavBar>
				<ScrollView id="HomeScrollView" style={ES({flex: 1})} scrollVBarStyle={{width: 10}}>
					<Switch>
						<HomeUI2/>
						{currentSubpage == "about" && <AboutUI/>}
					</Switch>
				</ScrollView>
			</Column>
		);
	}
}