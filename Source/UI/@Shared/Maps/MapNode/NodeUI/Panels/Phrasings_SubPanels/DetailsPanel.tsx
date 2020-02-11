import {Button, Column, Row} from "react-vcomponents";
import {BaseComponentWithConnector, BaseComponentPlus} from "react-vextensions";
import {ShowMessageBox} from "react-vmessagebox";
import {PhrasingDetailsUI} from "Source/UI/Database/Phrasings/PhrasingDetailsUI";
import {GetUpdates, Observer} from "vwebapp-framework";
import {E} from "js-vextensions";
import {MapNodePhrasing} from "Subrepos/Server/Source/@Shared/Store/firebase/nodePhrasings/@MapNodePhrasing";
import {GetUser, MeID} from "Subrepos/Server/Source/@Shared/Store/firebase/users";
import {IsUserCreatorOrMod} from "Subrepos/Server/Source/@Shared/Store/firebase/users/$user";
import {UpdatePhrasing} from "Subrepos/Server/Source/@Shared/Commands/UpdatePhrasing";
import {DeletePhrasing} from "Subrepos/Server/Source/@Shared/Commands/DeletePhrasing";

@Observer
export class DetailsPanel_Phrasings extends BaseComponentPlus({} as {phrasing: MapNodePhrasing}, {dataError: null as string}) {
	detailsUI: PhrasingDetailsUI;
	render() {
		const {phrasing} = this.props;
		const {dataError} = this.state;
		const creator = GetUser(phrasing.creator);

		const creatorOrMod = IsUserCreatorOrMod(MeID(), phrasing);
		return (
			<Column style={{position: "relative", width: "100%"}}>
				<PhrasingDetailsUI ref={c=>this.detailsUI = c}
					baseData={phrasing} forNew={false} enabled={creatorOrMod}
					onChange={(val, error)=>{
						this.SetState({dataError: error});
					}}/>
				{creatorOrMod &&
					<Row mt={5}>
						<Button text="Save" enabled={dataError == null} title={dataError} onLeftClick={async()=>{
							const phrasingUpdates = GetUpdates(phrasing, this.detailsUI.GetNewData());
							if (phrasingUpdates.VKeys().length) {
								await new UpdatePhrasing(E({id: phrasing._key, updates: phrasingUpdates})).Run();
							}
						}}/>
						<Button ml="auto" text="Delete" onLeftClick={async()=>{
							ShowMessageBox({
								title: "Delete phrasing", cancelButton: true,
								message: `
									Delete the node phrasing below?

									Text: ${phrasing.text}
								`.AsMultiline(0),
								onOK: async()=>{
									await new DeletePhrasing({id: phrasing._key}).Run();
								},
							});
						}}/>
					</Row>}
			</Column>
		);
	}
}