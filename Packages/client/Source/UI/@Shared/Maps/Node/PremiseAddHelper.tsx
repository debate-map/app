import keycode from "keycode";
import {Button, Row, TextArea} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {store} from "Store";
import {ACTNodeExpandedSet} from "Store/main/maps/mapViews/$mapView.js";
import {runInAction} from "web-vcore/nm/mobx.js";
import {OmitIfFalsy} from "web-vcore/nm/js-vextensions.js";

/* export class PremiseAddHelper extends BaseComponentPlus({} as {mapID: string, parentNode: NodeL3, parentPath: string}, { premiseTitle: '', adding: false }) {
	render() {
		const { mapID, parentNode, parentPath } = this.props;
		const { premiseTitle, adding } = this.state;

		if (adding) return <Row>Adding premise...</Row>;

		return (
			<Row style={{ alignItems: 'stretch', padding: '5px 0px' }}>
				{/* <TextInput placeholder="Type the argument's first claim/premise here." style={ES({flex: 1})}
					value={premiseTitle} onChange={val=>this.SetState({premiseTitle: val})}/> *#/}
				<TextArea className="noValidationColoring" required={true} pattern={NodeRevision_titlePattern} allowLineBreaks={false} autoSize={true} style={{ width: '100%' }}
					placeholder="Type the argument's first claim/premise here."
					onKeyDown={async (e) => {
						if (e.keyCode == keycode.codes.enter) {
							this.CreatePremise();
						}
					}}
					value={premiseTitle} onChange={(val) => this.SetState({ premiseTitle: val })}/>
				<Button enabled={premiseTitle.match(NodeRevision_titlePattern) != null} text="✔️" p="0 3px" style={{ borderRadius: '0 5px 5px 0' }}
					onClick={() => this.CreatePremise()}/>
			</Row>
		);
	}
	/* GetValidationError() {
		return GetErrorMessagesUnderElement(this.DOM)[0];
	} *#/

	async CreatePremise() {
		const { mapID, parentNode, parentPath } = this.props;
		const { premiseTitle } = this.state;

		this.SetState({ adding: true });

		const newNode = new NodeL1(EV({ type: NodeType.claim, ownerMapID: OmitIfFalsy(parentNode.ownerMapID) }));
		const newRevision = new NodeRevision({ titles: { base: premiseTitle } });
		const newLink = { _: true, form: ClaimForm.base } as NodeChildLink;

		const info = await new AddChildNode({ mapID, parentID: parentNode.id, node: newNode, revision: newRevision, link: newLink }).RunOnServer();
		ACTNodeExpandedSet({ mapID, path: `${parentPath}/${info.nodeID}`, expanded: true, resetSubtree: false });
		runInAction('PremiseAddHelper.CreatePremise', () => store.main.nodeLastAcknowledgementTimes.set(info.nodeID, Date.now()));

		// await WaitTillPathDataIsReceiving(`nodeRevisions/${info.revisionID}`);
		// await WaitTillPathDataIsReceived(`nodeRevisions/${info.revisionID}`);
	}
} */