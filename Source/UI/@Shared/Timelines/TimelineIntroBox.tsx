import {Column, Div} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {Timeline} from "Store/firebase/timelines/@Timeline";
import {VReactMarkdown_Remarkable, Observer} from "vwebapp-framework";
import {GetTimelineStep} from "Store/firebase/timelineSteps";
import {E} from "js-vextensions";

@Observer
export class TimelineIntroBox extends BaseComponentPlus({} as {timeline: Timeline}) {
	render() {
		const {timeline} = this.props;
		const firstStep = GetTimelineStep(timeline.steps[0]);
		if (firstStep == null) return null;

		return (
			<Column style={E({marginRight: 30, width: 500, whiteSpace: "normal", background: "rgba(0,0,0,.7)", borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"})}>
				<Div sel p="7px 10px">
					<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
						className="onlyTopMargin" style={{marginTop: 5, display: "flex", flexDirection: "column", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}
						source={firstStep.message} replacements={{}} extraInfo={{}}/>
				</Div>
			</Column>
		);
	}
}