import {Observer} from "web-vcore";
import {Button, Column, Row, TextInput} from "react-vcomponents";
import {BaseComponentPlus} from "react-vextensions";
import {liveSkin} from "Utils/Styles/SkinManager";

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

@Observer
export class TableHeader extends BaseComponentPlus({} as {
	columns: ColumnData[],
	tableData: TableData,
	onTableChange: (tableData: TableData) => void,
}, {
	addingFilter: "",
	filterValue: "",
}) {
	onColumnHeaderClick = (columnKey: string)=>{
		const {columnSort, columnSortDirection} = this.props.tableData;

		if (columnSort == columnKey) {
			if (columnSortDirection == "asc") {
				this.props.onTableChange({
					columnSort,
					columnSortDirection: "desc",
					filters: this.props.tableData.filters,
				});
			} else if (columnSortDirection == "desc") {
				this.props.onTableChange({
					columnSort: "",
					columnSortDirection: "",
					filters: this.props.tableData.filters,
				});
			} else {
				this.props.onTableChange({
					columnSort,
					columnSortDirection: "asc",
					filters: this.props.tableData.filters,
				});
			}
		} else {
			this.props.onTableChange({
				columnSort: columnKey,
				columnSortDirection: "asc",
				filters: this.props.tableData.filters,
			});
		}
	};

	onFilterChange = (key: string, value: string)=>{
		const {filters} = this.props.tableData;
		if (value == "") {
			this.onFilterRemove(key);
			return;
		}

		const existingFilterIndex = filters.findIndex(a=>a.key === key);
		const newFilters = [...filters];
		if (existingFilterIndex !== -1) {
			newFilters[existingFilterIndex] = {key, value};
		} else {
			newFilters.push({key, value});
		}
		this.props.onTableChange({
			columnSort: this.props.tableData.columnSort,
			columnSortDirection: this.props.tableData.columnSortDirection,
			filters: newFilters,
		});
	};

	onFilterRemove = (key: string)=>{
		const {filters} = this.props.tableData;
		const newFilters = filters.filter(a=>a.key !== key);
		this.props.onTableChange({
			columnSort: this.props.tableData.columnSort,
			columnSortDirection: this.props.tableData.columnSortDirection,
			filters: newFilters,
		});
	};

	render() {
		const {columns, tableData} = this.props;
		const {addingFilter, filterValue} = this.state;

		return (
			<Column className="clickThrough" style={{background: liveSkin.HeaderColor().css(), borderRadius: "10px 10px 0 0"}}>
				<Row style={{height: 40, padding: 10}}>
					{columns.map(column=>{
						return (
							<div key={column.key} style={{flex: column.width, position: "relative"}}>
								<span onClick={()=>{
									if (column.allowSort) {
										this.onColumnHeaderClick(column.key);
										this.SetState({addingFilter: "", filterValue: ""});
									}
								}} style={{fontWeight: 500, cursor: column.allowSort ? "pointer" : undefined, fontSize: 17, position: "relative"}}>
									{column.label}
									{column.allowSort && tableData.columnSort == column.key &&
										<span
											style={{
												fontSize: 14,
												marginLeft: 2,
												position: "absolute",
												left: "50%",
												transform: `translate(-50%, ${tableData.columnSortDirection == "asc" ? "-" : " "}50%)`,
												top: tableData.columnSortDirection == "asc" ? 0 : undefined,
												bottom: tableData.columnSortDirection == "desc" ? 0 : undefined,
											}}
											className={tableData.columnSortDirection === "asc" ? "mdi mdi-menu-up" : "mdi mdi-menu-down"} />
									}
								</span>
								{column.allowFilter && <span onClick={e=>{
									if (addingFilter) {
										this.SetState({addingFilter: "", filterValue: ""});
									} else {
										this.SetState({addingFilter: column.key});
									}
								}} style={{fontSize: 14, marginLeft: 2, cursor: "pointer"}} className="mdi mdi-filter-outline" />}
								{addingFilter == column.key &&
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
										<TextInput value={filterValue} onChange={val=>this.SetState({filterValue: val})} />
										<Button text="Apply" ml={5} onClick={()=>{
											this.onFilterChange(column.key, filterValue);
											this.SetState({addingFilter: "", filterValue: ""});
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
										{columns.find(a=>a.key == filter.key)?.label ?? filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}: {filter.value}
									</span>
									<span onClick={e=>{
										this.onFilterRemove(filter.key);
									}} style={{fontSize: 12, marginLeft: 2, cursor: "pointer"}} className="mdi mdi-close" />
								</div>
							);
						})}
					</Row>
				}
			</Column>
		);
	}
}