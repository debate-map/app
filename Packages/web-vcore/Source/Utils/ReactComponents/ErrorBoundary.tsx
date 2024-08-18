import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import React, {Component} from "react";
import {TextArea, Column} from "react-vcomponents";
import {ScrollView} from "react-vscrollview";
import {E} from "js-vextensions";
import {HandleError} from "../General/Errors.js";

export function BuildErrorWrapperComp<Props extends object>(regularUIFunc_getter: ()=>Function, errorUI?: ErrorUIFunc<Props>, errorUIStyle?) {
	return class ErrorWrapperComp extends BaseComponent<Props, {error: ReactError|null}> {
		componentDidCatch(message, info) { EB_StoreError(this as BaseComponent, message, info); }
		ClearError() { this.SetState({error: null}); }

		render() {
			const {error} = this.state;
			if (error) {
				const errorUIProps = {error, style: errorUIStyle, defaultUI: defaultErrorUI};
				return (errorUI ?? defaultErrorUI)(errorUIProps, this);
			}

			const RegularUIFunc = regularUIFunc_getter();
			return <RegularUIFunc {...this.props}/>;
		}
	};
}

type ReactErrorInfo = {componentStack: string};
export type ReactError = {message: string, info: ReactErrorInfo};

export type ErrorUIFunc<Props = {}> = (props: ErrorUIProps, comp: Component<Props>)=>JSX.Element;
export type ErrorUIProps = {error: ReactError, style, defaultUI: ErrorUIFunc};
export const defaultErrorUI = (props: ErrorUIProps)=>{
	const {error, style} = props;
	return (
		<ScrollView style={E({height: "100%", maxHeight: "100px"}, style)}>
			{/*<Text>An error has occurred in the UI-rendering code.</Text>
			<TextArea value={error}/>
			<TextArea value={errorInfo.componentStack}/>
			<TextArea value={ToJSON(errorInfo)}/>*/}
			<TextArea autoSize={true} value={`An error has occurred in the UI-rendering code.\n\n${error.message}\n${error.info.componentStack}`}/>
		</ScrollView>
	);
};

// todo: maybe remove this; better to just use componentDidError + "EB_" functions below directly
export class ErrorBoundary extends BaseComponentPlus({} as {errorUI?: ErrorUIFunc, errorUIStyle?}, {error: null as ReactError|null}) {
	componentDidCatch(message, info) { EB_StoreError(this as BaseComponent, message, info); }
	ClearError() { this.SetState({error: null}); }

	render() {
		const {errorUI, errorUIStyle, children} = this.props;
		const {error} = this.state;
		if (error) {
			const errorUIProps = {error, style: errorUIStyle, defaultUI: defaultErrorUI};
			return (errorUI ?? defaultErrorUI)(errorUIProps, this);
		}

		return children;
	}
}

// function-based approach
// todo: maybe add this functionality to the BaseComponentPlus function/class
export function EB_StoreError(comp: BaseComponent, error: Error | string, errorInfo: ReactErrorInfo) {
	const errorMessage = typeof error == "object" ? error.message : error;
	if (errorMessage.startsWith("[generic bail error")) {
		//throw new Error(`A bail-error was caught by react (${comp.constructor.name}.componentDidCatch); this should not occur. Did you forget to add "@Observer" to your component class?`);
		HandleError(new Error(`A bail-error was caught by react (${comp.constructor.name}.componentDidCatch); this should not occur. Did you forget to add "@Observer" to your component class?`));
	}

	const error_final = {message: errorMessage, origError: error, info: errorInfo};
	comp.SetState({error: error_final});
	console.log(`%c In ErrorBoundary/componentDidCatch. error:`, "color: #222; background: #dfd");
	console.log(error_final);
	//logErrorToMyService(error, info);
}
export function EB_ShowError(error: ReactError, style?) {
	return defaultErrorUI({error, style, defaultUI: defaultErrorUI});
}