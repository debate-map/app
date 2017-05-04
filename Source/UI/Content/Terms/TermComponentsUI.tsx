import {Assert} from "../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM} from "../../../Frame/UI/ReactGlobals";
import {Term, TermType} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";
import * as Moment from "moment";
import {GetUser, User, GetUserID} from "../../../Store/firebase/users";
import {Connect} from "../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../Frame/General/Enums";
import Select from "../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../Frame/ReactComponents/Row";
import CheckBox from "../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../Frame/ReactComponents/Button";
import TermComponent from "../../../Store/firebase/termComponents/@TermComponent";
import {GetTermComponents} from "../../../Store/firebase/termComponents";
import {CachedTransform} from "../../../Frame/V/VCache";
import {RootState} from "../../../Store/index";
import UpdateTermComponentData from "../../../Server/Commands/UpdateTermComponentData";
import {RemoveHelpers} from "../../../Frame/Database/DatabaseHelpers";
import {IsUserCreatorOrMod} from "../../../Store/firebase/userExtras";
import DeleteTermComponent from "../../../Server/Commands/DeleteTermComponent";
import {ShowMessageBox} from "../../../Frame/UI/VMessageBox";

let componentsPlaceholder = [];

type Props = {term: Term, style?} & Partial<{components: TermComponent[]}>;
@Connect((state: RootState, {term}: Props)=> {
	let termComponents = GetTermComponents(term);
	return {
		//components: GetTermComponents(props.term),
		// only pass components when all are loaded
		components: CachedTransform("components_transform1", {termID: term._id}, termComponents, ()=>termComponents.All(a=>a != null) ? termComponents : componentsPlaceholder),
		//selectedTermComponent: GetSelectedTermComponent(),
	};
})
export default class TermComponentsUI extends BaseComponent<Props, {}> {
	render() {
		let {term, style, components} = this.props;

		let creatorOrMod = IsUserCreatorOrMod(GetUserID(), term);

		return (
			<ScrollView contentStyle={{flex: 1, padding: 10}}>
				{components.map((comp, index)=> {
					return <TermComponentUI key={index} first={index == 0} termComponent={comp} editing={creatorOrMod}/>;
				})}
			</ScrollView>
		);
	}
}

export class TermComponentUI extends BaseComponent
		<{termComponent: TermComponent, first: boolean, editing?: boolean, creating?: boolean, onChange?: (updatedTermComponent: TermComponent)=>void},
		{updatedTermComponent: TermComponent}> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (props.creating || props.editing) {
			if (forMount || this.state.updatedTermComponent == null || props.termComponent != this.props.termComponent) // if base-data changed
				this.SetState({updatedTermComponent: Clone(props.termComponent)});
		}
	}

	render() {
		let {termComponent, first, editing, creating, onChange} = this.props;
		let {updatedTermComponent} = this.state;

		//let data = updatedTermComponent || termComponent;
		let changes = ToJSON(updatedTermComponent) != ToJSON(termComponent);

		let Change = _=> {
			if (onChange)
				onChange(this.GetUpdatedTermComponent());
			this.Update();
		};
		return (
			<Row mt={first ? 0 : 5}>
				{!creating && <Div mr={7} sel>#{termComponent._id}</Div>}
				{(creating || editing)
					? <TextInput ref={a=>a && creating && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
						value={updatedTermComponent.text} onChange={val=>Change(updatedTermComponent.text = val)}/>
					: <Div sel>{termComponent.text}</Div>}
				{editing &&
					<Button ml={5} text="Save" enabled={changes} onClick={e=> {
						new UpdateTermComponentData({termComponentID: termComponent._id, updates: updatedTermComponent.Including("text")}).Run();
						//this.SetState({updatedTermComponent: null});
					}}/>}
				{editing &&
					<Button ml={5} text="Cancel" enabled={changes} onClick={e=> {
						this.SetState({updatedTermComponent: Clone(termComponent)});
					}}/>}
				{editing &&
					<Button ml={5} text="X" onClick={e=> {
						ShowMessageBox({
							title: `Delete "${termComponent.text}"`, cancelButton: true,
							message: `Delete the term-component "${termComponent.text}"?`,
							onOK: async ()=> {
								new DeleteTermComponent({termComponentID: termComponent._id}).Run();
							}
						});
					}}/>}
			</Row>
		);
	}
	GetUpdatedTermComponent() {
		let {updatedTermComponent} = this.state;
		return Clone(updatedTermComponent) as TermComponent;
	}
}