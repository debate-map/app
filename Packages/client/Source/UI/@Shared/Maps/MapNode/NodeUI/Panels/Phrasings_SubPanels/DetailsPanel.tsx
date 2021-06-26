import {Button, Column, Row} from "web-vcore/nm/react-vcomponents";
import {BaseComponentWithConnector, BaseComponentPlus} from "web-vcore/nm/react-vextensions";
import {ShowMessageBox} from "web-vcore/nm/react-vmessagebox";
import {PhrasingDetailsUI} from "UI/Database/Phrasings/PhrasingDetailsUI";
import {GetUpdates, Observer} from "web-vcore";
import {E} from "web-vcore/nm/js-vextensions";
import {MapNodePhrasing} from "dm_common";
import {GetUser, MeID} from "dm_common";
import {IsUserCreatorOrMod} from "dm_common";
import {UpdatePhrasing} from "dm_common";
import {DeletePhrasing} from "dm_common";

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
								await new UpdatePhrasing(E({id: phrasing.id, updates: phrasingUpdates})).Run();
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
									await new DeletePhrasing({id: phrasing.id}).Run();
								},
							});
						}}/>
					</Row>}
			</Column>
		);
	}
}