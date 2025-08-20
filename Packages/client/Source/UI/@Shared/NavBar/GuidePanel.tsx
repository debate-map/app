import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";

export const GuidePanel = ()=>{
	return (
		<div style={{
			display: "flex", flexDirection: "column", padding: 5, borderRadius: "0 0 0 5px",
			background: liveSkin.NavBarPanelBackgroundColor().css(), border: liveSkin.OverlayBorder(),
		}}>
			Guide panel is under development.
		</div>
	);
};
