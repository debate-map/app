import {BaseComponent, Pre, RenderSource, Div} from "../../../Frame/UI/ReactGlobals";
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

type Props = {baseData: Term, newTerm: boolean, enabled?: boolean, style?, onChange?: (newData: Term)=>void} & Partial<{nodeCreator: User}>;
@Connect((state, props: Props)=>({
	nodeCreator: GetUser(props.baseData.creator),
}))
export default class TermEditorUI extends BaseComponent<Props, {newData: Term}> {
	/*constructor(props) {
		super(props);
		let {startData} = this.props;
		this.state = {data: Clone(startData)};
	}*/
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
	}
	render() {
		let {newTerm, enabled, style, onChange, nodeCreator} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange)
				onChange(this.GetNewData());
			this.Update();
		};
		return (
			<Column style={style}>
				{!newTerm &&
					<table className="selectable" style={{/*borderCollapse: "separate", borderSpacing: "10px 0"*/}}>
						<thead>
							<tr><th>ID</th><th>Creator</th><th>Created at</th></tr>
						</thead>
						<tbody>
							<tr>
								<td>{newData._id}</td>
								<td>{nodeCreator ? nodeCreator.displayName : `n/a`}</td>
								<td>{(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)}</td>
							</tr>
						</tbody>
					</table>}
				{/*<Div>ID: {newData._id}</Div>
				<Div mt={3}>Created at: {(Moment as any)(newData.createdAt).format(`YYYY-MM-DD HH:mm:ss`)
					} (by: {nodeCreator ? nodeCreator.displayName : `n/a`})</Div>*/}
				<RowLR mt={5} leftWidth={20} style={{width: 400}}>
					<Pre>Name: </Pre>
					<TextInput ref={a=>a && this.lastRender_source == RenderSource.Mount && WaitXThenRun(0, ()=>a.DOM.focus())}
						enabled={enabled} style={{width: "100%"}}
						value={newData.name} onChange={val=>Change(newData.name = val)}/>
				</RowLR>
				<RowLR mt={5} leftWidth={20} style={{width: 400}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TermType)} enabled={enabled} style={{flex: 1}}
						value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				<Row mt={5}>
					<Pre>Short description: </Pre>
					<TextInput enabled={enabled} style={{flex: 1}}
						value={newData.shortDescription_current} onChange={val=>Change(newData.shortDescription_current = val)}/>
				</Row>
			</Column>
		);
	}
	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as Term;
	}
}