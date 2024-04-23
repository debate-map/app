import {Draggable, DraggableProvided, DraggableStateSnapshot, DroppableProvided, DroppableStateSnapshot} from "@hello-pangea/dnd";
import {GetDOM, ShallowChanged} from "react-vextensions";
import {ToJSON} from "js-vextensions";
import React from "react";

// So why do we have a MakeDraggable decorator but not a MakeDroppable one?
// Basically, it's just that <Droppable> sections are usually not the root of a component, whereas <Draggable> sections almost always are.
// Thus, a MakeDroppable decorator just wouldn't be very useful. (ie. it would have few components using it)

//type DraggableCompProps = {type: string, draggableInfo: DraggableInfo, index: number, enabled: boolean};
type DraggableCompProps = {draggableInfo: DraggableInfo, index: number};

export type DropInfo = {provided: DroppableProvided, snapshot: DroppableStateSnapshot};
export type DragInfo = {provided: DraggableProvided, snapshot: DraggableStateSnapshot};

type DraggableInfo = any; // this is up to the parent project

export function MakeDraggable(getDraggableCompProps: (props: Object)=>DraggableCompProps) {
	return WrappedComponent=>{
		class WrapperComponent extends React.Component {
			static WrappedComponent = WrappedComponent;
			static displayName = WrappedComponent.displayName;

			UNSAFE_componentWillMount() {
				this.UpdateDraggableCompProps(this.props);
			}
			UNSAFE_componentWillReceiveProps(props) {
				this.UpdateDraggableCompProps(props);
			}

			compProps: DraggableCompProps;
			/*type: string;
			draggableInfo: DraggableInfo;
			index: number;*/
			UpdateDraggableCompProps(props) {
				/*const {type, draggableInfo, index} = getDraggableCompProps(props);
				this.type = type;
				this.draggableInfo = draggableInfo;
				this.index = index;*/
				//this.compProps = E({enabled: true}, getDraggableCompProps(props));
				this.compProps = getDraggableCompProps(props);
				//this.firstDragInfoForCurrentData = {} as DragInfo; // not sure if this is needed
			}

			firstDragInfoForCurrentData = {} as DragInfo;
			render() {
				//if (this.compProps == null || !this.compProps.enabled) {
				if (this.compProps === null) {
					return <Draggable key={"-123"} draggableId={"-123"} index={-123}>{(provided, snapshot)=>(<WrappedComponent {...this.props} dragInfo={null}/>)}</Draggable>;
				}
				if (this.compProps === undefined) {
					return <WrappedComponent {...this.props} dragInfo={null}/>;
				}

				const draggableID = ToJSON(this.compProps.draggableInfo);
				return (
					<Draggable key={draggableID} draggableId={draggableID} index={this.compProps.index}>
						{(provided, snapshot)=>{
							let dragInfo = {provided, snapshot} as DragInfo;
							// if drag-info data actually changed, store ref to first object with that data
							if (ShallowChanged(dragInfo, this.firstDragInfoForCurrentData)) {
							//if (ToJSON(dragInfo) != ToJSON(this.firstDragInfoForCurrentData)) {
								this.firstDragInfoForCurrentData = dragInfo;
							} else {
								// if drag-info *hasn't* changed data-wise, use the stable-ref object we stored (so we don't cause unneeded re-render)
								dragInfo = this.firstDragInfoForCurrentData;
							}
							return <WrappedComponent {...this.props} ref={c=>provided.innerRef(GetDOM(c) as any)} dragInfo={dragInfo}/>;
							// test
							/*return (
								<div ref={c=>provided.innerRef(c as any)}
										{...(dragInfo && dragInfo.provided.draggableProps)}
										{...(dragInfo && dragInfo.provided.dragHandleProps)}
										style={E(
											{width: 350, background: HSLA(0, 0, 0, .5), whiteSpace: "normal"},
											dragInfo && dragInfo.provided.draggableProps.style,
										)}>
									{ToJSON(dragInfo).substr(0, 30)}
								</div>
							);*/
						}}
					</Draggable>
				);
			}
		}
		return WrapperComponent as any;
	};
}