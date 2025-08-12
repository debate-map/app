import {Button, Column, Row, TextInput} from "react-vcomponents";
import {liveSkin} from "Utils/Styles/SkinManager";
import {observer_mgl} from "mobx-graphlink";
import {useCallback, useState} from "react";
import React from "react";

export type TableData = {
	columnSort: string,
	columnSortDirection: "asc" | "desc" | "",
	filters: {key: string, value: string}[],
}

export type ColumnData = {
	key: string,
	label: string,
	width: number,
	allowFilter: boolean,
	allowSort: boolean,
}

export type TableHeaderProps = {
	columns: ColumnData[],
	tableData: TableData,
	onTableChange: (tableData: TableData) => void,
};

export const TableHeader = observer_mgl((props: TableHeaderProps)=>{
	const {columns, tableData, onTableChange} = props;
	const [addingFilter, setAddingFilter] = useState<string>("");
	const [filterValue, setFilterValue] = useState<string>("");

	const onColumnHeaderClick = useCallback((columnKey: string)=>{
		const {columnSort, columnSortDirection, filters} = tableData;

		if (columnSort === columnKey) {
			if (columnSortDirection === "asc") {
				onTableChange({columnSort, columnSortDirection: "desc", filters});
			} else if (columnSortDirection === "desc") {
				onTableChange({columnSort: "", columnSortDirection: "", filters});
			} else {
				onTableChange({columnSort, columnSortDirection: "asc", filters});
			}
		} else {
			onTableChange({columnSort: columnKey, columnSortDirection: "asc", filters});
		}

		setAddingFilter("");
		setFilterValue("");
	}, [onTableChange, tableData]);

	const onFilterRemove = useCallback((key: string)=>{
		const {columnSort, columnSortDirection, filters} = tableData;
		const newFilters = filters.filter(f=>f.key !== key);
		onTableChange({columnSort, columnSortDirection, filters: newFilters});
	}, [onTableChange, tableData]);

	const onFilterChange = useCallback((key: string, value: string)=>{
		const {columnSort, columnSortDirection, filters} = tableData;

		if (value === "") {
			onFilterRemove(key);
			return;
		}

		const idx = filters.findIndex(f=>f.key === key);
		const newFilters = [...filters];

		if (idx !== -1) newFilters[idx] = {key, value};
		else newFilters.push({key, value});

		onTableChange({columnSort, columnSortDirection, filters: newFilters});
	}, [onTableChange, tableData, onFilterRemove]);

	return (
		<Column className="clickThrough" style={{background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
			<Row style={{height: 40, padding: 10}}>
				{columns.map(column=>{
					return (
						<div key={column.key} style={{flex: column.width, position: "relative"}}>
							<span onClick={()=>{
								if (column.allowSort) {
									onColumnHeaderClick(column.key);
									setFilterValue("");
									setAddingFilter("");
								}
							}} style={{fontWeight: 500, cursor: column.allowSort ? "pointer" : undefined, fontSize: 17, position: "relative"}}>
								{column.label}
								{column.allowSort && tableData.columnSort === column.key &&
									<span
										style={{
											fontSize: 14,
											marginLeft: 2,
											position: "absolute",
											left: "50%",
											transform: `translate(-50%, ${tableData.columnSortDirection === "asc" ? "-" : ""}50%)`,
											top: tableData.columnSortDirection === "asc" ? 0 : undefined,
											bottom: tableData.columnSortDirection === "desc" ? 0 : undefined,
										}}
										className={tableData.columnSortDirection === "asc" ? "mdi mdi-menu-up" : "mdi mdi-menu-down"} />
								}
							</span>
							{column.allowFilter && <span onClick={()=>{
								if (addingFilter) {
									setAddingFilter("");
									setFilterValue("");
								} else {
									setAddingFilter(column.key);
								}
							}} style={{fontSize: 14, marginLeft: 2, cursor: "pointer"}} className="mdi mdi-filter-outline" />}
							{addingFilter === column.key &&
								<div style={{
									position: "absolute",
									left: 0,
									bottom: 0,
									transform: "translateY(100%)",
									zIndex: 100,
									background: liveSkin.HeaderColor().alpha(0.9).css(),
									display: "flex",
									flexFlow: "row nowrap",
									padding: "2px",
								}}>
									<TextInput value={filterValue} onChange={val=>{setFilterValue(val)}}/>
									<Button text="Apply" ml={5} onClick={()=>{
										onFilterChange(column.key, filterValue);
										setAddingFilter("");
										setFilterValue("");
									}} />
								</div>
							}
						</div>
					);
				})}
			</Row>
			{tableData.filters.length > 0 &&
				<Row style={{padding: "5px 10px 10px 10px", display: "flex", flexFlow: "row wrap", gap: 4}}>
					{tableData.filters.map(filter=>{
						return (
							<div key={filter.key} style={{
								position: "relative",
								height: 20,
								fontSize: 12,
								backgroundColor: liveSkin.TextColor().css(),
								color: liveSkin.ListEntryBackgroundColor_Dark().css(),
								display: "flex",
								alignItems: "center",
								padding: "0 10px",
								borderRadius: 10,
							}}>
								<span style={{fontWeight: 500, display: "flex", alignItems: "center"}}>
									{columns.find(a=>a.key === filter.key)?.label ?? filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}: {filter.value}
								</span>
								<span onClick={()=>{ onFilterRemove(filter.key)}} style={{fontSize: 12, marginLeft: 2, cursor: "pointer"}} className="mdi mdi-close" />
							</div>
						);
					})}
				</Row>
			}
		</Column>
	);
});
