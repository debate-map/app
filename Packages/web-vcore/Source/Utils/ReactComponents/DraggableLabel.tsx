import {BaseComponent, cssHelper} from "react-vextensions";
import {Vector2, E} from "js-vextensions";
import React from "react";

export class DraggableLabel extends BaseComponent<{
	onDragStart: ()=>any,
	onDrag?: (dragDelta: Vector2, dragTotal: Vector2, finalEvent: boolean)=>any,
} & Omit<React.HTMLProps<HTMLLabelElement>, "onDragStart" | "onDrag">, {}> {
	render() {
		const {onDragStart, onDrag, style, ...rest} = this.props;
		const {css} = cssHelper(this);
		return (
			<label {...rest}
				style={css(
					onDrag && {cursor: "col-resize"},
					style,
				)}
				onMouseDown={e=>{
					if (onDrag == null) return;

					this.mouseDownPos = new Vector2(e.pageX, e.pageY);
					this.lastMousePos = this.mouseDownPos;
					onDragStart();

					document.addEventListener("mousemove", this.OnMouseMove_Global);
					document.addEventListener("mouseup", this.OnMouseUp_Global);
				}}/>
		);
	}

	ComponentWillUnmount() {
		this.RemoveListeners();
	}
	RemoveListeners() {
		document.removeEventListener("mousemove", this.OnMouseMove_Global);
		document.removeEventListener("mouseup", this.OnMouseUp_Global);
	}

	mouseDownPos: Vector2;
	lastMousePos: Vector2;
	OnMouseMove_Global = (e: MouseEvent)=>{
		const {onDrag} = this.props;
		const mousePos = new Vector2(e.pageX, e.pageY);
		onDrag!(mousePos.Minus(this.lastMousePos), mousePos.Minus(this.mouseDownPos), false);

		this.lastMousePos = mousePos;
	};
	OnMouseUp_Global = (e: MouseEvent)=>{
		const {onDrag} = this.props;
		const mousePos = new Vector2(e.pageX, e.pageY);
		onDrag!(mousePos.Minus(this.lastMousePos), mousePos.Minus(this.mouseDownPos), true);

		this.RemoveListeners();
	};
}