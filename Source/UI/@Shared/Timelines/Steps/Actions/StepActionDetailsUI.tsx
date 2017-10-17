import {Assert} from "../../../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM, GetErrorMessagesUnderElement} from "../../../../../Frame/UI/ReactGlobals";
import Column from "../../../../../Frame/ReactComponents/Column";
import Row from "../../../../../Frame/ReactComponents/Row";
import TextInput from "../../../../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetUser, User} from "../../../../../Store/firebase/users";
import {Connect} from "../../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../../Frame/General/Enums";
import Select from "../../../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../../../Frame/ReactComponents/Row";
import CheckBox from "../../../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../../../Frame/ReactComponents/Button";
import TermComponent from "../../../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../../../Store/firebase/terms";
import InfoButton from "../../../../../Frame/ReactComponents/InfoButton";
import Spinner from "../../../../../Frame/ReactComponents/Spinner";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {TimelineStepAction, TimelineStep, TimelineStepActionType} from "../../../../../Store/firebase/timelineSteps/@TimelineStep";
import {UpdateTimelineStep} from "../../../../../Server/Commands/UpdateTimelineStep";
import {RemoveHelpers} from "../../../../../Frame/Database/DatabaseHelpers";
import {BoxController, ShowMessageBox} from "../../../../../Frame/UI/VMessageBox";
import TextArea from "../../../../../Frame/ReactComponents/TextArea";

type Props = {baseData: TimelineStepAction, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: TimelineStepAction, ui: TimelineStepActionDetailsUI)=>void};
export default class TimelineStepActionDetailsUI extends BaseComponent<Props, {newData: TimelineStepAction}> {
	static defaultProps = {enabled: true};
	ComponentWillMountOrReceiveProps(props, forMount) {
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: Clone(props.baseData)});
		}
	}

	render() {
		let {forNew, enabled, style, onChange} = this.props;
		let {newData} = this.state;
		let Change = _=> {
			if (onChange) onChange(this.GetNewData(), this);
			this.Update();
		};

		let splitAt = 170, width = 600;
		return (
			<div> {/* needed so GetInnerComp() works */}
			<Column style={style}>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Type: </Pre>
					<Select options={GetEntries(TimelineStepActionType)} value={newData.type} onChange={val=>Change(newData.type = val)}/>
				</RowLR>
				{newData.type == TimelineStepActionType.ShowComment &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Author: </Pre>
						<TextInput value={newData.showComment_commentAuthor} onChange={val=>Change(newData.showComment_commentAuthor = val)}/>
					</RowLR>}
				{newData.type == TimelineStepActionType.ShowComment &&
					<Column mt={5} style={{width}}>
						<Pre>Text: </Pre>
						<TextArea value={newData.showComment_commentText} onChange={val=>Change(newData.showComment_commentText = val)}/>
					</Column>}
				{newData.type == TimelineStepActionType.ShowNode &&
					<RowLR mt={5} splitAt={splitAt} style={{width}}>
						<Pre>Node ID: </Pre>
						<Spinner value={newData.showNode_nodeID} onChange={val=>Change(newData.showNode_nodeID = val)}/>
					</RowLR>}
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as TimelineStepAction;
	}
}

export function ShowEditTimelineStepActionDialog(userID: string, step: TimelineStep, action: TimelineStepAction) {
	let newAction = RemoveHelpers(Clone(action));
	
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: `Edit action`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TimelineStepActionDetailsUI baseData={newAction} forNew={true} onChange={(val, ui)=>Change(newAction = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			let newActions = RemoveHelpers(Clone(step.actions));
			newActions[step.actions.indexOf(action)] = newAction;
			new UpdateTimelineStep({stepID: step._id, stepUpdates: {actions: newActions}}).Run();
		}
	});
}