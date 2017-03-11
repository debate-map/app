import Action from "../General/Action";
var s = VMessageBox;

export type MessageBoxOptions = {title?: string, message: string, onOK: ()=>boolean | void, onCancel?: ()=>boolean | void, style?: {overlay?, content?}};
export class ACTShowMessageBox extends Action<MessageBoxOptions> {}

export type ConfirmationBoxOptions = {title?: string, message: string, onOK: ()=>boolean | void, onCancel?: ()=>boolean | void, style?: {overlay?, content?}};
export class ACTShowConfirmationBox extends Action<ConfirmationBoxOptions> {}

export default class VMessageBox {
	static ShowMessageBox(o: ConfirmationBoxOptions) {
		o = {title: ""}.Extended2(o);
		store.dispatch(new ACTShowMessageBox(o));
	}
	static ShowConfirmationBox(o: ConfirmationBoxOptions) {
		o = {title: ""}.Extended2(o);
		store.dispatch(new ACTShowConfirmationBox(o));
	}
}