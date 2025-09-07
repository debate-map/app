import {CloneWithPrototypes, GetErrorMessagesUnderElement} from "js-vextensions";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {BaseComponent, GetDOM} from "react-vextensions";

export type DetailsUI_Phase = "create" | "edit" | "view";
export type DetailsUIBaseProps<T, ExtraProps> = {
	baseData: T;
	phase: DetailsUI_Phase;
	style?: React.CSSProperties;
	onChange?: (data: T, error: string | null) => void;
} & ExtraProps;

export type DetailsUIBaseState<T> = {
	newData: T;
	dataError: string | null;
}

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
} & DetailsUIBaseState<T>;

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
