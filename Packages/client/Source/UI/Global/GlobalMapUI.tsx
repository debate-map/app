import React from "react";
import {PageContainer} from "web-vcore";
import {globalMapID} from "dm_common";
import {MapUIWrapper} from "UI/@Shared/Maps/MapUIWrapper.js";
import {observer_mgl} from "mobx-graphlink";

export const GlobalMapUI = observer_mgl(()=>{
	return (
		<PageContainer preset="full" style={{margin: 0}}>
			<MapUIWrapper mapID={globalMapID}/>
		</PageContainer>
	);
});
