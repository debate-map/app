import React from "react";
import {Row} from "react-vcomponents";

/** Variant of <ul> which provides more control over the layout. */
export const List = (props: {items: (string | React.JSX.Element)[]})=>{
	return (
		// span is used to remain a "valid child" of <p>
		<div style={{display: "block", padding: "5px 0 5px 5px"}}>
			{props.items.map((item, index)=>{
				return <Row key={index} style={{/*alignItems: "center"*/}}>
					<span style={{
						fontSize: 20, lineHeight: "19px", // 20px places dot a bit lower than text center fsr
						fontWeight: "bold", padding: "0 5px",
					}}>•</span>
					{item}
				</Row>;
			})}
		</div>
	);
};