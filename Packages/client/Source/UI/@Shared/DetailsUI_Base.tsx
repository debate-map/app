import {CloneWithPrototypes, GetErrorMessagesUnderElement} from "js-vextensions";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {BaseComponent, GetDOM} from "react-vextensions";

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

export type DetailsUIBaseProps<T, ExtraProps> = {
	baseData: T;
	phase: DetailsUI_Phase;
	style?: React.CSSProperties;
	onChange?: (data: T, error: string | null) => void;
} & ExtraProps;

export type UseDetailsUIOptions<T> = {
    baseData: T;
    phase: DetailsUI_Phase;
    onChange?: (data: T, error: string|n) => void;
    /** Post-process before it becomes the next value. */
    getNewDataPostProcess?: (v: T) => void;
    /** Extra validation: return a string (error) or null/undefined if valid. */
    getValidationErrorExtras?: () => string|n;
};

export type UseDetailsUIResult<T> = {
    newData: T;
    /** Latest validation error, or `null`. */
    dataError: string | null;
    setNewData: (next: T) => void;
	/** Run validation immediately (DOM + extras). */
    getValidationError: () => string | null;
	/** Get a processed clone of `newData` (applies post-process). */
    getNewData: () => T;
    helpers: {
        creating: boolean;
        editing: boolean;
        viewing: boolean;
        enabled: boolean;
		Change: (..._: any[]) => void;
    };
    /** Attach to a wrapper element. Used by DOM-based validation (`GetErrorMessagesUnderElement`). */
    containerRef: React.RefObject<HTMLElement | null>;
};

export function useDetailsUI<T>(options: UseDetailsUIOptions<T>): UseDetailsUIResult<T> {
	const {baseData, phase, onChange, getNewDataPostProcess, getValidationErrorExtras} = options;

	const [newData, setNewData] = useState<T>(()=>CloneWithPrototypes(baseData));
	const [dataError, setDataError] = useState<string | null>(null);
	const containerRef = useRef<HTMLElement>(null);

	useEffect(()=>{
		setNewData(CloneWithPrototypes(baseData));
	}, [baseData]);

	const getNewData = useCallback((): T=>{
		const result = CloneWithPrototypes(newData) as T;
		getNewDataPostProcess?.(result);
		return result;
	}, [newData, getNewDataPostProcess]);

	const getValidationError = useCallback((): string | null=>{
		const root = containerRef.current as HTMLElement | null;
		if (root) {
			const uiErrors = GetErrorMessagesUnderElement(root);
			if (uiErrors.length) return uiErrors[0];
		}
		const extra = getValidationErrorExtras?.();
		if (extra) return extra;
		return null;
	}, [getValidationErrorExtras]);

	const Change = useCallback(()=>{
		const next = getNewData();
		const error = getValidationError();

		onChange?.(next, error);
		setNewData(next);
		setDataError(error);
	}, [getNewData, getValidationError, onChange]);

	const helpers = useMemo(()=>({
		creating: phase === "create",
		editing: phase === "edit",
		viewing: phase === "view",
		enabled: phase === "create" || phase === "edit",
		Change: (..._: any[])=>Change(),
	}), [phase, Change]);

	return {newData, dataError, setNewData, getValidationError, getNewData, helpers, containerRef};
};
