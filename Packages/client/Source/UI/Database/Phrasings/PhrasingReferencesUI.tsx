import {InfoButton} from "web-vcore";
import {Button, Row, Text, TextInput} from "react-vcomponents";
import {PhrasingDetailsUI_SharedProps} from "./PhrasingDetailsUI.js";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

export const PhrasingReferencesUI = observer_mgl(({enabled, newData, Change}: PhrasingDetailsUI_SharedProps)=>{
	return (
		<>
			<Row center mt={5}>
				<Text style={{fontWeight: "bold"}}>References:</Text>
				<InfoButton ml={5} text={`
					URL links to webpages containing text that exactly (or virtually exactly) matches this phrasing's text.
				`.AsMultiline(0)}/>
				<Button ml={5} p="3px 7px" text="+" enabled={enabled} onClick={()=>Change(newData.references.push(""))}/>
			</Row>
			{newData.references.map((ref, index)=>{
				return (
					<Row key={index} mt={2}>
						<Text>{index + 1}:</Text>
						<Row ml={5} style={{flex: 1}}>
							<TextInput placeholder="Webpage URL..." enabled={enabled} style={{width: "100%", fontSize: 13, borderRadius: "5px 0 0 5px"}}
								value={ref} onChange={val=>Change(newData.references[index] = val)}/>
						</Row>
						<Button text="X" enabled={enabled} style={{padding: "3px 5px", borderRadius: "0 5px 5px 0"}} onClick={()=>{
							newData.references.RemoveAt(index);
							Change();
						}}/>
					</Row>
				);
			})}
		</>
	);
});
