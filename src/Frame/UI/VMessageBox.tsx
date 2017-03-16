import Action from "../General/Action";
import {BaseComponent, AddGlobalStyle} from "./ReactGlobals";
import Modal from "react-modal";
import Button from "../ReactComponents/Button";
import {E} from "../General/Globals_Free";

export interface MessageBoxOptions {
	boxID: number;
	ui: JSX.Element,
	title: string, // only for contentLabel prop
	onCancel: ()=>boolean | voidy, // only for overlay-click
	overlayStyle?,
	containerStyle?,
}
export class ACTShowMessageBox extends Action<MessageBoxOptions> {}

let lastBoxID = -1;
let boxUIs = {};
export function ShowMessageBox_Base(o: MessageBoxOptions) {
	o.boxID = ++lastBoxID;

	// store ui in extra storage, kuz it gets ruined when put in Redux store
	boxUIs[o.boxID] = o.ui;
	delete o.ui;

	store.dispatch(new ACTShowMessageBox(o));
}
export function ShowMessageBox(o: {
			title?: string, titleUI?: JSX.Element,
			message?: string, messageUI?: JSX.Element,
			okButton?: boolean, cancelButton?: boolean,
			overlayStyle?, containerStyle?,
			onOK?: ()=>boolean | voidy, onCancel?: ()=>boolean | voidy,
		}) {
	o = E({okButton: true}, o);

	let oFinal = {} as MessageBoxOptions;
	oFinal.ui = (
		<div>
			{o.titleUI || <div style={{fontSize: "18px", fontWeight: "bold"}}>{o.title}</div>}
			{o.messageUI || <p style={{marginTop: 15}}>{o.message}</p>}
			{o.okButton &&
				<Button text="OK"
					onClick={()=> {
						if (o.onOK && o.onOK() === false) return;
						store.dispatch(new ACTShowMessageBox(null));
					}}/>}
			{o.cancelButton &&
				<Button text="Cancel" ml={o.okButton ? 10 : 0} onClick={()=> {
					if (o.onCancel && o.onCancel() === false) return;
					store.dispatch(new ACTShowMessageBox(null));
				}}/>}
		</div>
	);
	oFinal.title = o.title;
	oFinal.onCancel = o.onCancel;
	oFinal.overlayStyle = o.overlayStyle;
	oFinal.containerStyle = o.containerStyle;
	ShowMessageBox_Base(oFinal);
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
export class MessageBoxUI extends BaseComponent<{options: MessageBoxOptions}, {}> {
	render() {
		let {boxID, title, onCancel, overlayStyle, containerStyle} = this.props.options;
		let ui = boxUIs[boxID];
		return (
			<Modal isOpen={true} contentLabel={title || ""} style={{overlay: E(styles.overlay, overlayStyle), content: E(styles.container, containerStyle)}}
					onRequestClose={()=> {
						if (onCancel && onCancel() === false) return;
						store.dispatch(new ACTShowMessageBox(null));
					}}>
				{ui}
			</Modal>
		);
	}
}