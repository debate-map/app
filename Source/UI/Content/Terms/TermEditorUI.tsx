import {BaseComponent, Pre, RenderSource} from "../../../Frame/UI/ReactGlobals";
import {Term} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";

export default class TermEditorUI extends BaseComponent<{term: Term, onChange: Function}, {termCopy: Term}> {
	constructor(props) {
		super(props);
		let {term} = this.props;
		this.state = {termCopy: Clone(term)};
	}
	render() {
		let {term, onChange} = this.props;
		let Change = _=>onChange();
		return (
			<Column>
				<Row mt={5}>
					<Pre>Name: </Pre>
					<TextInput ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
						value={term.name} onChange={val=>Change(term.name = val)}/>
				</Row>
				<Row mt={5}>
					<Pre>Short description: </Pre>
					<TextInput style={{flex: 1}}
						value={term.shortDescription_current} onChange={val=>Change(term.shortDescription_current = val)}/>
				</Row>
			</Column>
		);
	}
	GetUpdatedTerm() {
		let {termCopy} = this.state;
		return Clone(termCopy) as Term;
	}
}