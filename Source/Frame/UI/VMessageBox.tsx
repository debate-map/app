import {onLogFuncs} from "../General/Logging";
import Action from "../General/Action";
import {BaseComponent, AddGlobalStyle} from "./ReactGlobals";
import Modal from "react-modal";
import Button from "../ReactComponents/Button";
import {E} from "../General/Globals_Free";
import {connect} from "react-redux";
import {RootState} from "../../Store/index";

export class MessageBoxOptions {
	title?: string;
	titleUI?: ()=>JSX.Element
	message?: string;
	messageUI?: ()=>JSX.Element;
	okButton = true;
	cancelButton = false;
	overlayStyle?;
	containerStyle?;
	onOK?: ()=>boolean | voidy;
	onCancel?: ()=>boolean | voidy;
	
	ui: ()=>JSX.Element;
	boxID: number;
}
export class ACTMessageBoxShow extends Action<MessageBoxOptions> {}
export class ACTMessageBoxUpdate extends Action<{boxID: number}> {}

export class BoxController {
	constructor(options: MessageBoxOptions, boxID: number) {
		this.options = options;
		this.boxID = boxID;
	}
	options: MessageBoxOptions;
	boxID: number;

	UpdateUI() {
		store.dispatch(new ACTMessageBoxUpdate({boxID: this.boxID}));
	}
	Close() {
		store.dispatch(new ACTMessageBoxShow(null));
	}
}

let lastBoxID = -1;
let boxUIs = {} as {[key: number]: ()=>JSX.Element};
export function ShowMessageBox_Base(o: MessageBoxOptions) {
	o.boxID = ++lastBoxID;

	// store ui in extra storage, kuz it gets ruined when put in Redux store
	boxUIs[o.boxID] = o.ui;
	delete o.ui;

	store.dispatch(new ACTMessageBoxShow(o));

	return new BoxController(o, o.boxID);
}
//export function ShowMessageBox(options: Partial<MessageBoxOptions>) {
export function ShowMessageBox(options: {[P in keyof MessageBoxOptions]?: MessageBoxOptions[P]}) { // do it this way, so the options are shown
	let o = E(new MessageBoxOptions(), options) as MessageBoxOptions;

	o.ui = ()=>(
		<div>
			{o.titleUI ? o.titleUI() : <div style={{fontSize: "18px", fontWeight: "bold"}}>{o.title}</div>}
			{o.messageUI ? o.messageUI() : <p style={{marginTop: 15, whiteSpace: "pre"}}>{o.message}</p>}
			{o.okButton &&
				<Button text="OK"
					onClick={()=> {
						if (o.onOK && o.onOK() === false) return;
						boxController.Close();
					}}/>}
			{o.cancelButton &&
				<Button text="Cancel" ml={o.okButton ? 10 : 0} onClick={()=> {
					if (o.onCancel && o.onCancel() === false) return;
					boxController.Close();
				}}/>}
		</div>
	);

	var boxController = ShowMessageBox_Base(o);
	return boxController;
}

AddGlobalStyle(`
.ReactModal__Overlay { z-index: 1; }
`);

let styles = {
	overlay: {position: "fixed", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,.5)"},
	container: {
		position: "absolute", overflow: "auto",
		//top: "40px", left: "40px", right: "40px", bottom: "40px",
		left: "50%", right: "initial", top: "50%", bottom: "initial", transform: "translate(-50%, -50%)",
		background: "rgba(0,0,0,.75)", border: "1px solid #555", WebkitOverflowScrolling: "touch", borderRadius: "4px", outline: "none", padding: "20px"
	}
};


export class MessageBoxState {
	openOptions: MessageBoxOptions;
}
export function MessageBoxReducer(state = new MessageBoxState(), action: Action<any>) {
	if (action.Is(ACTMessageBoxShow))
		return {...state, openOptions: action.payload};
	if (action.Is(ACTMessageBoxUpdate))
		return {...state, openOptions: {...state.openOptions}};
	return state;
}

@(connect((state: RootState)=>({
	options: state.messageBox.openOptions,
})) as any)
export class MessageBoxUI extends BaseComponent<{} & Partial<{options: MessageBoxOptions}>, {}> {
	render() {
		let {options} = this.props;
		if (options == null) return <div/>;

		let {boxID, title, onCancel, overlayStyle, containerStyle} = options;
		let ui = boxUIs[boxID];
		return (
			<Modal isOpen={true} contentLabel={title || ""} style={{overlay: E(styles.overlay, overlayStyle), content: E(styles.container, containerStyle)}}
					onRequestClose={()=> {
						if (onCancel && onCancel() === false) return;
						store.dispatch(new ACTMessageBoxShow(null));
					}}>
				{ui()}
			</Modal>
		);
	}
}