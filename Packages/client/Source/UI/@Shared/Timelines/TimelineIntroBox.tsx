import {Column, Div} from "react-vcomponents";
import {VReactMarkdown_Remarkable} from "web-vcore";
import {E} from "js-vextensions";
import {Timeline, TimelineStep} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type Props = {
	timeline: Timeline,
	steps: TimelineStep[]
};

export const TimelineIntroBox = observer_mgl((props: Props)=>{
	const {steps} = props;
	const firstStep = steps[0];
	if (firstStep == null) return null;

	return (
		<Column style={E({marginRight: 30, width: 500, whiteSpace: "normal", background: liveSkin.OverlayPanelBackgroundColor().css(), borderRadius: 10, border: "1px solid rgba(255,255,255,.15)"})}>
			<Div sel p="7px 10px">
				<VReactMarkdown_Remarkable addMarginsForDanglingNewLines={true}
					className="onlyTopMargin" style={{marginTop: 5, display: "flex", flexDirection: "column", filter: "drop-shadow(0px 0px 10px rgba(0,0,0,1))"}}
					source={firstStep.message} replacements={{}} extraInfo={{}}/>
			</Div>
		</Column>
	);
});
