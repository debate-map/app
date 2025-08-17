import {Button, Column, Row} from "react-vcomponents";
import {ShowMessageBox} from "react-vmessagebox";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {GetUpdates} from "web-vcore";
import {E} from "js-vextensions";
import {NodePhrasing, MeID, DMap, NodeL3, PERMISSIONS} from "dm_common";
import {RunCommand_DeleteNodePhrasing, RunCommand_UpdateNodePhrasing} from "Utils/DB/Command";
import {observer_mgl} from "mobx-graphlink";
import React, {useRef, useState} from "react";

type DetailsPanel_Phrasings_Props = {
	map: DMap|n,
	node: NodeL3,
	phrasing: NodePhrasing
};

export const DetailsPanel_Phrasings = observer_mgl((props: DetailsPanel_Phrasings_Props)=>{
	const {map, node, phrasing} = props;

	const detailsUIRef = useRef<PhrasingDetailsUI>(null);
	const [dataError, setDataError] = useState<string|n>(null);
	const creatorOrMod = PERMISSIONS.NodePhrasing.Access(MeID(), phrasing);

	return (
		<Column style={{position: "relative", width: "100%"}}>
			<PhrasingDetailsUI ref={detailsUIRef}
				baseData={phrasing} map={map} node={node}
				forNew={false} enabled={creatorOrMod}
				onChange={(val, error)=>{
					setDataError(error);
				}}/>
			{creatorOrMod &&
				<Row mt={5}>
					<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
						const phrasingUpdates = GetUpdates(phrasing, detailsUIRef.current!.GetNewData());
						if (phrasingUpdates.VKeys().length) {
							await RunCommand_UpdateNodePhrasing(E({id: phrasing.id, updates: phrasingUpdates}));
						}
					}}/>
					<Button ml="auto" text="Delete" onLeftClick={async()=>{
						ShowMessageBox({
							title: "Delete phrasing", cancelButton: true,
							message: `
								Delete the node phrasing below?

								Text (base): ${phrasing.text_base}${
								phrasing.text_negation == null ? "" : `\nText (negation): ${phrasing.text_negation}`
								}${
									phrasing.text_question == null ? "" : `\nText (question): ${phrasing.text_question}`
								}${
									phrasing.text_narrative == null ? "" : `\nText (narrative): ${phrasing.text_narrative}`
								}
							`.AsMultiline(0),
							onOK: async()=>{
								//await new DeletePhrasing({id: phrasing.id}).RunOnServer();
								await RunCommand_DeleteNodePhrasing({id: phrasing.id});
							},
						});
					}}/>
				</Row>}
		</Column>
	);
});
