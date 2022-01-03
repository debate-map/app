import {CloneWithPrototypes, GetErrorMessagesUnderElement} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";

export type DetailsUI_Phase = "create" | "edit" | "view";
export type DetailsUI_Base_Props<T, ClassType> = {baseData: T, phase: DetailsUI_Phase, style?, onChange?: (data: T, error: string, instance: ClassType)=>void};
export type DetailsUI_Base_State<T> = {newData: T, dataError: string};

export class DetailsUI_Base<T, ClassType, ExtraProps = {}> extends BaseComponent<DetailsUI_Base_Props<T, ClassType> & ExtraProps, DetailsUI_Base_State<T>> {
	ComponentWillMountOrReceiveProps(props, forMount) {
		// prop defaults
		//props.enabled = props.enabled ?? true;
		// state defaults
		if (forMount || props.baseData != this.props.baseData) { // if base-data changed
			this.SetState({newData: CloneWithPrototypes(props.baseData)});
		}
	}

	OnChange() {
		const {onChange} = this.props;
		const newData = this.GetNewData();
		const error = this.GetValidationError();
		if (onChange) onChange(newData, error, this as any);
		this.SetState({newData, dataError: error});
	}

	get helpers() {
		return {
			Change: (..._)=>this.OnChange(),
			creating: this.props.phase == "create",
			editing: this.props.phase == "edit",
			viewing: this.props.phase == "view",
			enabled: this.props.phase == "create" || this.props.phase == "edit",
		};
	}

	/** Use this to add extra validation checks to this.GetValidationError(). */
	GetValidationError_Extras(): any {}
	GetValidationError() {
		const uiErrors = GetErrorMessagesUnderElement(GetDOM(this));
		if (uiErrors.length) return uiErrors[0];
		const extraError = this.GetValidationError_Extras();
		if (extraError) return extraError;
		return null;
	}

	/** Use this to add post-processing of the copy of this.state.newData, whenever a copy is made (eg. when Change() is called, and SetState({newData}) is about to be called). */
	GetNewData_PostProcess(newData: T) {}
	GetNewData() {
		const {newData} = this.state;
		const result = CloneWithPrototypes(newData) as T;
		this.GetNewData_PostProcess(result);
		return result;
	}
}