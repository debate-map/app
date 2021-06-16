/* export function ShowAddSubnodeDialog(mapID: string, anchorNode: MapNodeL2, anchorNodePath: string) {
	let dialog: AddSubnodeDialog;
	const boxController = ShowMessageBox({
		title: 'Add subnode (to layer)', cancelButton: true,
		message: () => <AddSubnodeDialog ref={(c) => dialog = c} {...{ mapID, anchorNode, anchorNodePath, boxController }}/>,
		onOK: () => dialog.OnOK(),
	});
}

type Props = {mapID: string, anchorNode: MapNode, anchorNodePath: string, boxController: BoxController};
class AddSubnodeDialog extends BaseComponentPlus({} as Props, {} as {layer: Layer, newNode: MapNode, newRevision: MapNodeRevision, newLink: ChildEntry, validationError: string}) {
	constructor(props) {
		super(props);
		const newNode = new MapNode({
			type: MapNodeType.Claim,
		});
		const newRevision = new MapNodeRevision({});
		const newLink = E({ _: true }, newNode.type == MapNodeType.Claim && { form: ClaimForm.Base }) as ChildEntry; // not actually used
		this.state = { newNode, newRevision, newLink } as any;
	}
	UpdateOKButton() {
		const { boxController } = this.props;
		const { validationError } = this.state;
		// update ok-button
		const newClickable = validationError == null;
		if (newClickable != boxController.options.okButtonClickable) {
			boxController.options.okButtonClickable = newClickable;
			boxController.UpdateUI();
		}
	}

	nodeEditorUI: NodeDetailsUI;
	render() {
		const { boxController } = this.props;
		const { layer, newNode, newRevision, newLink, validationError } = this.state;

		const layers = GetLayers();

		const claimTypes = GetEntries(ClaimType);
		if (!HasModPermissions(MeID())) {
			claimTypes.Remove(claimTypes.find((a) => a.value == ClaimType.Image));
		}

		const layersWeCanAddTo = layers.filter((a) => a.creator == MeID());
		const layerOptions = [{ name: '', value: null }].concat(layersWeCanAddTo.map((a) => ({ name: a.name, value: a })));

		return (
			<div>
				<Column style={{ padding: '10px 0', width: 600 }}>
					<Row>
						<Pre>Layer: </Pre>
						<Select options={layerOptions} value={layer} onChange={(val) => this.SetState({ layer: val })}/>
					</Row>
					{newNode.type == MapNodeType.Claim &&
					<Row mt={5}>
						<Pre>Type: </Pre>
						<Select displayType="button bar" options={claimTypes} style={{ display: 'inline-block' }}
							value={GetClaimType(AsNodeL2(newNode, newRevision))}
							onChange={(val) => {
								newRevision.Extend({ equation: null, contentNode: null, image: null });
								if (val == ClaimType.Normal) {
								} else if (val == ClaimType.Equation) {
									newRevision.equation = new Equation();
								} else if (val == ClaimType.Quote) {
									newRevision.contentNode = new ContentNode();
								} else {
									newRevision.image = new MediaAttachment();
								}
								this.Update();
							}}/>
					</Row>}
					<NodeDetailsUI ref={(c) => this.nodeEditorUI = c} parent={null}
						baseData={AsNodeL3(AsNodeL2(newNode, newRevision))} baseRevisionData={newRevision} baseLinkData={newLink} forNew={true}
						onChange={(newNodeData, newRevisionData, newLinkData, comp) => {
							this.SetState({ newNode: newNodeData, newRevision: newRevisionData, newLink: newLinkData });
						}}/>
					{/* validationError && <Row mt={3} style={{color: "rgba(255,200,200,.5)"}}>{FinalizeValidationError(validationError)}</Row> *#/}
				</Column>
			</div>
		);
	}
	PostRender() {
		const oldError = this.state.validationError;
		const newError = this.GetValidationError();
		if (newError != oldError) {
			// this.Update();
			this.SetState({ validationError: newError }, () => this.UpdateOKButton());
		}
	}

	GetValidationError() {
		if (this.nodeEditorUI && this.nodeEditorUI.GetValidationError()) return this.nodeEditorUI.GetValidationError();
		const { layer } = this.state;
		if (layer == null) return 'A layer must be selected.';
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	async OnOK() {
		const { mapID, anchorNode, anchorNodePath } = this.props;
		const { layer, newNode, newRevision, newLink } = this.state;

		/* if (validationError) {
			return void setTimeout(()=>ShowMessageBox({title: `Validation error`, message: `Validation error: ${validationError}`}));
		} *#/

		const newNodeID = await new AddSubnode({
			mapID, layerID: layer._key, anchorNodeID: anchorNode._key,
			subnode: newNode, subnodeRevision: newRevision, // link: newLink,
		}).Run();
		// store.dispatch(new ACTMapNodeExpandedSet_InLayer({mapID, anchorNodePath, layerID: layer._id, layerPath: newNodeID, expanded: true, recursive: false}));
	}
}

function FinalizeValidationError(message: string) {
	if (message == 'Please fill out this field.') return 'Please fill out the highlighted field.';
	return message;
} */