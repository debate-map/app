import Action from "../General/Action";

export type MessageBoxOptions = {title?: string, message: string, onOK?: ()=>boolean | voidy, onCancel?: ()=>boolean | voidy, style?: {overlay?, content?}};
export class ACTShowMessageBox extends Action<MessageBoxOptions> {}

export type ConfirmationBoxOptions = {title?: string, message: string, onOK?: ()=>boolean | voidy, onCancel?: ()=>boolean | voidy, style?: {overlay?, content?}};
export class ACTShowConfirmationBox extends Action<ConfirmationBoxOptions> {}

/*export default class VMessageBox {
	static ShowMessageBox(o: ConfirmationBoxOptions) {
		o = {title: ""}.Extended2(o);
		store.dispatch(new ACTShowMessageBox(o));
	}
	static ShowConfirmationBox(o: ConfirmationBoxOptions) {
		o = {title: ""}.Extended2(o);
		store.dispatch(new ACTShowConfirmationBox(o));
	}
}*/

export function ShowMessageBox(o: MessageBoxOptions) {
	o = {title: ""}.Extended2(o);
	store.dispatch(new ACTShowMessageBox(o));
}
export function ShowConfirmationBox(o: ConfirmationBoxOptions) {
	o = {title: ""}.Extended2(o);
	store.dispatch(new ACTShowConfirmationBox(o));
}