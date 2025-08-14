import {Div, Column, Button} from "react-vcomponents";
import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";
import {observer_mgl} from "mobx-graphlink";

export type TableFooter_Props = {
    totalRows: number;
    rowsPerPage: number;
    page: number;
    onPageChange: (page: number) => void;
};

export const TableFooter = observer_mgl((props: TableFooter_Props)=>{
	const {page, rowsPerPage, totalRows, onPageChange} = props;

	return (
		<Column className="clickThrough" style={{background: liveSkin.HeaderColor().css(), borderRadius: " 0 0 10px 10px", padding: "10px"}}>
			<Div style={{
				display: "grid",
				gridTemplateColumns: "1fr 1fr 1fr",
			}}>
				<span style={{display:"flex", alignItems: "center"}}>Showing {Math.min(page * rowsPerPage + 1, totalRows)}-{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows}</span>
				<Div style={{display: "flex", justifyContent: "center"}}>
					<Div style={{display: "flex", gap: "4px"}}>
						<Button enabled={page != 0} onClick={()=>onPageChange(0)}>{"<<"}</Button>
						<Button enabled={page != 0} onClick={()=>onPageChange(page - 1)}>{"<"}</Button>
						<span style={{display:"flex", alignItems: "center", padding: "0 10px"}}>{page + 1}</span>
						<Button enabled={page < Math.ceil(totalRows / rowsPerPage) - 1} onClick={()=>onPageChange(page + 1)}>{">"}</Button>
						<Button enabled={page < Math.ceil(totalRows / rowsPerPage) - 1} onClick={()=>onPageChange(Math.ceil(totalRows / rowsPerPage) - 1)}>{">>"}</Button>
					</Div>
				</Div>
			</Div>
		</Column>
	);
});
