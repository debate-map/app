import {BaseComponent, BaseComponentPlus, ApplyBasicStyles} from "react-vextensions";
import {Text, Row, Button} from "react-vcomponents";
import React, {Fragment} from "react";
import {SplitStringBySlash_Cached} from "mobx-graphlink";
import {CopyText} from "js-vextensions";

export class UUIDStub extends BaseComponent<{id: string}, {}> {
	render() {
		const {id} = this.props;
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
}

@ApplyBasicStyles
export class UUIDPathStub extends BaseComponent<{path: string, copyButton: boolean}> {
	static defaultProps = {copyButton: true};
	render() {
		const {path, copyButton} = this.props;
		const pathIDs = SplitStringBySlash_Cached(path);
		return <Row>
			{pathIDs.map((id, index)=>{
				return <Fragment key={index}>
					{index != 0 && <Text>/</Text>}
					<UUIDStub id={id}/>
				</Fragment>;
			})}
			{copyButton && <Button ml={5} mdIcon="content-copy" onClick={()=>{
				CopyText(path);
			}}/>}
		</Row>;
	}
}