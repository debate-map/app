import {Assert} from "../../../../Frame/General/Assert";
import {BaseComponent, Pre, RenderSource, Div, FindDOM, GetErrorMessagesUnderElement} from "../../../../Frame/UI/ReactGlobals";
import Column from "../../../../Frame/ReactComponents/Column";
import Row from "../../../../Frame/ReactComponents/Row";
import TextInput from "../../../../Frame/ReactComponents/TextInput";
import Moment from "moment";
import {GetUser, User} from "../../../../Store/firebase/users";
import {Connect} from "../../../../Frame/Database/FirebaseConnect";
import {GetEntries} from "../../../../Frame/General/Enums";
import Select from "../../../../Frame/ReactComponents/Select";
import {RowLR} from "../../../../Frame/ReactComponents/Row";
import CheckBox from "../../../../Frame/ReactComponents/CheckBox";
import ScrollView from "react-vscrollview";
import Button from "../../../../Frame/ReactComponents/Button";
import TermComponent from "../../../../Store/firebase/termComponents/@TermComponent";
import {GetNiceNameForTermType} from "../../../../UI/Content/TermsUI";
import {GetTermVariantNumber} from "../../../../Store/firebase/terms";
import InfoButton from "../../../../Frame/ReactComponents/InfoButton";
import Spinner from "../../../../Frame/ReactComponents/Spinner";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {TimelineStep} from "../../../../Store/firebase/timelineSteps/@TimelineStep";
import {UpdateTimelineStep} from "../../../../Server/Commands/UpdateTimelineStep";
import {RemoveHelpers} from "../../../../Frame/Database/DatabaseHelpers";
import {BoxController, ShowMessageBox} from "../../../../Frame/UI/VMessageBox";
import TextArea from "../../../../Frame/ReactComponents/TextArea";
import {GetUpdates} from "../../../../Frame/General/Others";
import {TextArea_AutoSize} from "../../../../Frame/ReactComponents/TextArea";

type Props = {baseData: TimelineStep, forNew: boolean, enabled?: boolean, style?, onChange?: (newData: TimelineStep, ui: TimelineStepDetailsUI)=>void};
export default class TimelineStepDetailsUI extends BaseComponent<Props, {newData: TimelineStep}> {
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
					<Pre>Title: </Pre>
					<TextInput value={newData.title} onChange={val=>Change(newData.title = val)}/>
				</RowLR>
				<Column mt={5} style={{width}}>
					<Pre>Message: </Pre>
					<TextArea_AutoSize value={newData.message} onChange={val=>Change(newData.message = val)}/>
				</Column>
				<RowLR mt={5} splitAt={splitAt} style={{width}}>
					<Pre>Nodes to show: </Pre>
					<TextInput value={newData.nodesToShowStr} onChange={val=>Change(newData.nodesToShowStr = val)}/>
				</RowLR>
			</Column>
			</div>
		);
	}
	GetValidationError() {
		return GetErrorMessagesUnderElement(FindDOM(this))[0];
	}

	GetNewData() {
		let {newData} = this.state;
		return Clone(newData) as TimelineStep;
	}
}

export function ShowEditTimelineStepDialog(userID: string, step: TimelineStep) {
	let newStep = RemoveHelpers(Clone(step));
	
	let error = null;
	let Change = (..._)=>boxController.UpdateUI();
	let boxController = ShowMessageBox({
		title: `Edit step`, cancelButton: true,
		messageUI: ()=> {
			boxController.options.okButtonClickable = error == null;
			return (
				<Column style={{padding: `10px 0`, width: 600}}>
					<TimelineStepDetailsUI baseData={newStep} forNew={true} onChange={(val, ui)=>Change(newStep = val, error = ui.GetValidationError())}/>
					{error && error != "Please fill out this field." && <Row mt={5} style={{color: "rgba(200,70,70,1)"}}>{error}</Row>}
				</Column>
			);
		},
		onOK: ()=> {
			let stepUpdates = GetUpdates(step, newStep);
			new UpdateTimelineStep({stepID: step._id, stepUpdates}).Run();
		}
	});
}