import {BaseComponent, Pre, RenderSource} from "../../../Frame/UI/ReactGlobals";
import {Term} from "../../../Store/firebase/terms/@Term";
import Column from "../../../Frame/ReactComponents/Column";
import Row from "../../../Frame/ReactComponents/Row";
import TextInput from "../../../Frame/ReactComponents/TextInput";

export default class TermEditorUI extends BaseComponent<{startData: Term, onChange?: (updatedData: Term)=>void}, {data: Term}> {
	constructor(props) {
		super(props);
		let {startData} = this.props;
		this.state = {data: Clone(startData)};
	}
	/*ComponentWillMountOrReceiveProps(props) {
		let {startData} = props;
		if (startData != this.props.startData) // if start-data changed
			this.SetState({data: Clone(startData)});
	}*/
	render() {
		let {onChange} = this.props;
		let {data} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};
		return (
			<Column>
				<Row>
					<Pre>Name: </Pre>
					<TextInput ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())} style={{flex: 1}}
						value={data.name} onChange={val=>Change(data.name = val)}/>
				</Row>
				<Row mt={5}>
					<Pre>Short description: </Pre>
					<TextInput style={{flex: 1}}
						value={data.shortDescription_current} onChange={val=>Change(data.shortDescription_current = val)}/>
				</Row>
			</Column>
		);
	}
	GetNewData() {
		let {data} = this.state;
		return Clone(data) as Term;
	}
}