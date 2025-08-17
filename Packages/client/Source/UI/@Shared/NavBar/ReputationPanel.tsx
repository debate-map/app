import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";

export const ReputationPanel = ()=>{
	return (
		<div style={{
			display: "flex", flexDirection: "column", padding: 5, borderRadius: "0 0 0 5px",
			background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
		}}>
			Reputation panel is under development.
		</div>
	);
};
