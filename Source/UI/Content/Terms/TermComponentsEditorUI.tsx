import {Assert} from "../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM} from "../../../Frame/UI/ReactGlobals";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import * as Moment from "moment";
import {GetUser, User} from "../../../Store/firebase/users";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import Select from "../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../Frame/ReactComponents/Row";
import CheckBox from "../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../Frame/ReactComponents/Button";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import {GetTermComponents} from "../../../Store/firebase/termComponents";

type Props = {term: Term, style?} & Partial<{components: TermComponent[], selectedTermComponent: TermComponent}>;
@Connect((state, props: Props)=>({
	components: GetTermComponents(props.term),
	//selectedTermComponent: GetSelectedTermComponent(),
}))
export default class TermComponentsEditorUI extends BaseComponent<Props, {}> {
	render() {
		let {term, style, components, selectedTermComponent} = this.props;
		return (
			<ScrollView contentStyle={{flex: 1, padding: 10}}>
				{components.map((comp, index)=> {
					return <TermComponentUI key={index} first={index == 0} termComponent={comp} selected={selectedTermComponent == comp}/>;
				})}
			</ScrollView>
		);
	}
}

class TermComponentUI extends BaseComponent<{termComponent: TermComponent, first: boolean, selected: boolean}, {}> {
	render() {
		return (
			<div>
			</div>
		);
	}
}