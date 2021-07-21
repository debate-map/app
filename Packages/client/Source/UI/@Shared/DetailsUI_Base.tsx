import {CloneWithPrototypes, GetErrorMessagesUnderElement} from "web-vcore/nm/js-vextensions.js";
import {BaseComponent, GetDOM} from "web-vcore/nm/react-vextensions.js";

export type DetailsUI_Base_Props<T, ClassType> = {baseData: T, phase: "create" | "edit" | "view", style?, onChange?: (data: T, error: string, instance: ClassType)=>void};
export type DetailsUI_Base_State<T> = {newData: T, dataError: string};

export class DetailsUI_Base<T, ClassType> extends BaseComponent<DetailsUI_Base_Props<T, ClassType>, DetailsUI_Base_State<T>> {
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

	GetValidationError() {
		return GetErrorMessagesUnderElement(GetDOM(this))[0];
	}

	GetNewData() {
		const {newData} = this.state;
		return CloneWithPrototypes(newData) as T;
	}
}