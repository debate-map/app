import {Row, Button, RowProps} from "react-vcomponents";
import {Range, E} from "js-vextensions";
import React from "react";
import {BaseProps, BasicStyles} from "react-vextensions";

export type StarsRating_Props = {
	value: number,
	onChange: (value: number)=>any,
	titleFunc?: (starValue: number)=>string,
	rightClickAction?: "clear" | ((e: React.MouseEvent)=>any),
} & RowProps & BaseProps;

export const StarsRating = (props: StarsRating_Props)=>{
	const {
		value,
		titleFunc = starValue=>`Rate ${starValue} stars (right-click to clear)`,
		rightClickAction = "clear",
		style,
		onChange,
		...rest
	} = props;

	return (
		<Row {...rest} style={E({alignItems: "center"}, style, BasicStyles(rest))}>
			{Range(1, 5).map(starValue=>{
				return (
					<Button key={starValue} size={20} mdIcon={value >= starValue ? "star" : "star-outline"}
						title={titleFunc ? titleFunc(starValue) : `Set rating to ${starValue} stars`}
						onClick={()=>{
							onChange(starValue);
						}}
						onContextMenu={e=>{
							if (rightClickAction === "clear") {
								e.preventDefault();
								onChange(0);
								return;
							}
							if (rightClickAction instanceof Function) {
								return rightClickAction(e);
							}
						}}/>
				);
			})}
		</Row>
	);
};
