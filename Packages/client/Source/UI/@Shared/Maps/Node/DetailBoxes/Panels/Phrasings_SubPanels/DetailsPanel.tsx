import {Button, Column, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox.js";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI.js";
import {GetUpdates, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions.js";
import {NodePhrasing, GetUser, MeID, IsUserCreatorOrMod, UpdatePhrasing, DeletePhrasing, NodeL3} from "dm_common";
import {RunCommand_DeleteNodePhrasing, RunCommand_UpdateNodePhrasing} from "Utils/DB/Command";

@Observer
export class DetailsPanel_Phrasings extends BaseComponentPlus({} as {node: NodeL3, phrasing: NodePhrasing}, {dataError: null as string|n}) {
	detailsUI: PhrasingDetailsUI;
	render() {
		const {node, phrasing} = this.props;
		const {dataError} = this.state;
		const creator = GetUser(phrasing.creator);

		const creatorOrMod = IsUserCreatorOrMod(MeID(), phrasing);
		return (
			<Column style={{position: "relative", width: "100%"}}>
				<PhrasingDetailsUI ref={c=>this.detailsUI = c!}
					baseData={phrasing} node={node}
					forNew={false} enabled={creatorOrMod}
					onChange={(val, error)=>{
						this.SetState({dataError: error});
					}}/>
				{creatorOrMod &&
					<Row mt={5}>
						<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
							const phrasingUpdates = GetUpdates(phrasing, this.detailsUI.GetNewData());
							if (phrasingUpdates.VKeys().length) {
								//await new UpdatePhrasing(E({id: phrasing.id, updates: phrasingUpdates})).RunOnServer();
								await RunCommand_UpdateNodePhrasing(E({id: phrasing.id, updates: phrasingUpdates}));
							}
						}}/>
						<Button ml="auto" text="Delete" onLeftClick={async()=>{
							ShowMessageBox({
								title: "Delete phrasing", cancelButton: true,
								message: `
									Delete the node phrasing below?

									Text (base): ${phrasing.text_base}${
									phrasing.text_negation == null ? "" : `\nText (negation): ${phrasing.text_negation}`}${
										phrasing.text_question == null ? "" : `\nText (question): ${phrasing.text_question}`}
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
	}
}