import {Observer} from "web-vcore";
import {Div, Column, Button} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";
import React from "react";

export type TableFooterData = {
	page: number,
}

@Observer
export class TableFooter extends BaseComponentPlus({} as {
	totalRows: number,
	rowsPerPage: number,
	page: number,
	onPageChange: (page: number) => void,
}, {
	addingFilter: "",
	filterValue: "",
}) {
	// onColumnHeaderClick = (columnKey: string)=>{
	// 	const {columnSort, columnSortDirection} = this.props.tableData;

	// 	if (columnSort == columnKey) {
	// 		if (columnSortDirection == "asc") {
	// 			this.props.onTableChange({
	// 				columnSort,
	// 				columnSortDirection: "desc",
	// 				filters: this.props.tableData.filters,
	// 			});
	// 		} else if (columnSortDirection == "desc") {
	// 			this.props.onTableChange({
	// 				columnSort: "",
	// 				columnSortDirection: "",
	// 				filters: this.props.tableData.filters,
	// 			});
	// 		} else {
	// 			this.props.onTableChange({
	// 				columnSort,
	// 				columnSortDirection: "asc",
	// 				filters: this.props.tableData.filters,
	// 			});
	// 		}
	// 	} else {
	// 		this.props.onTableChange({
	// 			columnSort: columnKey,
	// 			columnSortDirection: "asc",
	// 			filters: this.props.tableData.filters,
	// 		});
	// 	}
	// };

	// onFilterChange = (key: string, value: string)=>{
	// 	const {filters} = this.props.tableData;
	// 	if (value == "") {
	// 		this.onFilterRemove(key);
	// 		return;
	// 	}

	// 	const existingFilterIndex = filters.findIndex(a=>a.key === key);
	// 	const newFilters = [...filters];
	// 	if (existingFilterIndex !== -1) {
	// 		newFilters[existingFilterIndex] = {key, value};
	// 	} else {
	// 		newFilters.push({key, value});
	// 	}
	// 	this.props.onTableChange({
	// 		columnSort: this.props.tableData.columnSort,
	// 		columnSortDirection: this.props.tableData.columnSortDirection,
	// 		filters: newFilters,
	// 	});
	// };

	// onFilterRemove = (key: string)=>{
	// 	const {filters} = this.props.tableData;
	// 	const newFilters = filters.filter(a=>a.key !== key);
	// 	this.props.onTableChange({
	// 		columnSort: this.props.tableData.columnSort,
	// 		columnSortDirection: this.props.tableData.columnSortDirection,
	// 		filters: newFilters,
	// 	});
	// };

	render() {
		const {page, rowsPerPage, totalRows} = this.props;
		const {addingFilter, filterValue} = this.state;

		return (
			<Column className="clickThrough" style={{background: liveSkin.HeaderColor().css(), borderRadius: " 0 0 10px 10px", padding: "10px"}}>
				<Div style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr",
				}}>
					<span style={{display:"flex", alignItems: "center"}}>Showing {Math.min(page * rowsPerPage + 1, totalRows)}-{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows}</span>
					<Div style={{display: "flex", justifyContent: "center"}}>
						<Div style={{display: "flex", gap: "4px"}}>
							<Button enabled={page != 0} onClick={()=>this.props.onPageChange(0)}>{"<<"}</Button>
							<Button enabled={page != 0} onClick={()=>this.props.onPageChange(page - 1)}>{"<"}</Button>
							<span style={{display:"flex", alignItems: "center", padding: "0 10px"}}>{page + 1}</span>
							<Button enabled={page < Math.ceil(totalRows / rowsPerPage) - 1} onClick={()=>this.props.onPageChange(page + 1)}>{">"}</Button>
							<Button enabled={page < Math.ceil(totalRows / rowsPerPage) - 1} onClick={()=>this.props.onPageChange(Math.ceil(totalRows / rowsPerPage) - 1)}>{">>"}</Button>
						</Div>
					</Div>
				</Div>
			</Column>
		);
	}
}