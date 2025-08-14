import {BaseProps, BasicStyles} from "react-vextensions";
import {Text, Row, Button} from "react-vcomponents";
import React, {Fragment} from "react";
import {SplitStringBySlash_Cached} from "mobx-graphlink";
import {CopyText} from "js-vextensions";
import {E} from "js-vextensions";

export const UUIDStub = ({id}: {id: string})=>{
	const id_start = id.slice(0, 4);
	const id_end = id.slice(4);

	return (
		<Row title={id} style={{whiteSpace: "pre"}}>
			<Text>{id_start}</Text>
			<Text style={{position: "absolute", opacity: 0, pointerEvents: "none"}}>{id_end}</Text>
			<Text style={{fontSize: 1, width: 0, opacity: 0}}> </Text>
		</Row>
	);
}

export type UUIDPathStub_Props = {
	path: string,
	copyButton: boolean
} & BaseProps;

export const UUIDPathStub = (props: UUIDPathStub_Props)=>{
	const {path, copyButton = true, ...rest} = props;
	const pathIDs = SplitStringBySlash_Cached(path);

	return <Row style={E(BasicStyles(rest))}>
		{pathIDs.map((id, index)=>{
			return <Fragment key={index}>
				{index != 0 && <Text>/</Text>}
				<UUIDStub id={id}/>
			</Fragment>;
		})}
		{copyButton && <Button ml={5} mdIcon="content-copy" onClick={()=>CopyText(path)}/>}
	</Row>;
};
