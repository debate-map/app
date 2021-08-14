/*
Based on: https://github.com/pyramation/postgraphile-plugin-fulltext-filter/blob/master/src/PostgraphileFullTextFilterPlugin.js
Changes:
* Changed "to_tsvector" calls to use the custom "english_nostop" dictionary (see InitDB_Template.ts); this enables more powerful searching, by letting even "stop words" be searched against.
*/

// v-added
import {createRequire} from "module";
const require = createRequire(import.meta.url);

const {Tsquery} = require("pg-tsquery");
const {omit} = require("graphile-build-pg");

const tsquery = new Tsquery();

export function PostGraphileFulltextFilterPlugin(builder) {
	builder.hook("inflection", (inflection, build)=>build.extend(inflection, {
		fullTextScalarTypeName() {
			return "FullText";
		},
		pgTsvRank(fieldName) {
			return this.camelCase(`${fieldName}-rank`);
		},
		pgTsvOrderByColumnRankEnum(table, attr, ascending) {
			const columnName = attr.kind === "procedure"
				? attr.name.substr(table.name.length + 1)
				: this._columnName(attr, {skipRowId: true}); // eslint-disable-line no-underscore-dangle
			return this.constantCase(`${columnName}_rank_${ascending ? "asc" : "desc"}`);
		},
	}));

	builder.hook("build", build=>{
		const {
			pgIntrospectionResultsByKind: introspectionResultsByKind,
			pgRegisterGqlTypeByTypeId: registerGqlTypeByTypeId,
			pgRegisterGqlInputTypeByTypeId: registerGqlInputTypeByTypeId,
			graphql: {
				GraphQLScalarType,
			},
			inflection,
		} = build;

		const tsvectorType = introspectionResultsByKind.type.find(
			t=>t.name === "tsvector",
		);
		if (!tsvectorType) {
			throw new Error("Unable to find tsvector type through introspection.");
		}

		const scalarName = inflection.fullTextScalarTypeName();

		const GraphQLFullTextType = new GraphQLScalarType({
			name: scalarName,
			serialize(value) {
				return value;
			},
			parseValue(value) {
				return value;
			},
			parseLiteral(lit) {
				return lit;
			},
		});

		registerGqlTypeByTypeId(tsvectorType.id, ()=>GraphQLFullTextType);
		registerGqlInputTypeByTypeId(tsvectorType.id, ()=>GraphQLFullTextType);

		return build.extend(build, {
			pgTsvType: tsvectorType,
		});
	});

	builder.hook("init", (_, build)=>{
		const {
			addConnectionFilterOperator,
			pgSql: sql,
			pgGetGqlInputTypeByTypeIdAndModifier: getGqlInputTypeByTypeIdAndModifier,
			graphql: {
				GraphQLString,
			},
			pgTsvType,
		} = build;

		if (!pgTsvType) {
			return build;
		}

		if (!(addConnectionFilterOperator instanceof Function)) {
			throw new Error("PostGraphileFulltextFilterPlugin requires PostGraphileConnectionFilterPlugin to be loaded before it.");
		}

		const InputType = getGqlInputTypeByTypeIdAndModifier(pgTsvType.id, null);
		addConnectionFilterOperator(
			InputType.name,
			"matches",
			"Performs a full text search on the field.",
			()=>GraphQLString,
			(identifier, val, input, fieldName, queryBuilder)=>{
				const tsQueryString = `${tsquery.parse(input) || ""}`;
				queryBuilder.__fts_ranks = queryBuilder.__fts_ranks || {};
				queryBuilder.__fts_ranks[fieldName] = [identifier, tsQueryString];

				// v-replaced
				//return sql.query`${identifier} @@ to_tsquery(${sql.value(tsQueryString)})`;
				return sql.query`${identifier} @@ to_tsquery('english_nostop', ${sql.value(tsQueryString)})`;
			},
			{
				allowedFieldTypes: [InputType.name],
			},
		);

		return build;
	});

	builder.hook("GraphQLObjectType:fields", (fields, build, context)=>{
		const {
			pgIntrospectionResultsByKind: introspectionResultsByKind,
			graphql: {GraphQLFloat},
			pgColumnFilter,
			pg2gql,
			pgSql: sql,
			inflection,
			pgTsvType,
		} = build;

		const {
			scope: {isPgRowType, isPgCompoundType, pgIntrospection: table},
			fieldWithHooks,
		} = context;

		if (
			!(isPgRowType || isPgCompoundType)
			|| !table
			|| table.kind !== "class"
			|| !pgTsvType
		) {
			return fields;
		}

		const tableType = introspectionResultsByKind.type
			.filter(type=>type.type === "c"
				&& type.namespaceId === table.namespaceId
				&& type.classId === table.id)[0];
		if (!tableType) {
			throw new Error("Could not determine the type of this table.");
		}

		const tsvColumns = table.attributes
			.filter(attr=>attr.typeId === pgTsvType.id)
			.filter(attr=>pgColumnFilter(attr, build, context))
			.filter(attr=>!omit(attr, "filter"));

		const tsvProcs = introspectionResultsByKind.procedure
			.filter(proc=>proc.isStable)
			.filter(proc=>proc.namespaceId === table.namespaceId)
			.filter(proc=>proc.name.startsWith(`${table.name}_`))
			.filter(proc=>proc.argTypeIds.length > 0)
			.filter(proc=>proc.argTypeIds[0] === tableType.id)
			.filter(proc=>proc.returnTypeId === pgTsvType.id)
			.filter(proc=>!omit(proc, "filter"));

		if (tsvColumns.length === 0 && tsvProcs.length === 0) {
			return fields;
		}

		const newRankField = (baseFieldName, rankFieldName)=>fieldWithHooks(
			rankFieldName,
			({addDataGenerator})=>{
				addDataGenerator(({alias})=>({
					pgQuery: queryBuilder=>{
						const {parentQueryBuilder} = queryBuilder;
						if (
							!parentQueryBuilder
							|| !parentQueryBuilder.__fts_ranks
							|| !parentQueryBuilder.__fts_ranks[baseFieldName]) {
							return;
						}
						const [
							identifier,
							tsQueryString,
						] = parentQueryBuilder.__fts_ranks[baseFieldName];
						queryBuilder.select(

							// v-replaced
							//sql.fragment`ts_rank(${identifier}, to_tsquery(${sql.value(tsQueryString)}))`,
							sql.fragment`ts_rank(${identifier}, to_tsquery('english_nostop', ${sql.value(tsQueryString)}))`,

							alias,
						);
					},
				}));
				return {
					description: `Full-text search ranking when filtered by \`${baseFieldName}\`.`,
					type: GraphQLFloat,
					resolve: data=>pg2gql(data[rankFieldName], GraphQLFloat),
				};
			},
			{
				isPgTSVRankField: true,
			},
		);

		const tsvFields = tsvColumns
			.reduce((memo, attr)=>{
				const fieldName = inflection.column(attr);
				const rankFieldName = inflection.pgTsvRank(fieldName);
				memo[rankFieldName] = newRankField(fieldName, rankFieldName); // eslint-disable-line no-param-reassign

				return memo;
			}, {});

		const tsvProcFields = tsvProcs
			.reduce((memo, proc)=>{
				const psuedoColumnName = proc.name.substr(table.name.length + 1);
				const fieldName = inflection.computedColumn(psuedoColumnName, proc, table);
				const rankFieldName = inflection.pgTsvRank(fieldName);
				memo[rankFieldName] = newRankField(fieldName, rankFieldName); // eslint-disable-line no-param-reassign

				return memo;
			}, {});

		return {...fields, ...tsvFields, ...tsvProcFields};
	});

	builder.hook("GraphQLEnumType:values", (values, build, context)=>{
		const {
			extend,
			pgSql: sql,
			pgColumnFilter,
			pgIntrospectionResultsByKind: introspectionResultsByKind,
			inflection,
			pgTsvType,
		} = build;

		const {
			scope: {
				isPgRowSortEnum,
				pgIntrospection: table,
			},
		} = context;

		if (!isPgRowSortEnum || !table || table.kind !== "class" || !pgTsvType) {
			return values;
		}

		const tableType = introspectionResultsByKind.type
			.filter(type=>type.type === "c"
				&& type.namespaceId === table.namespaceId
				&& type.classId === table.id)[0];
		if (!tableType) {
			throw new Error("Could not determine the type of this table.");
		}

		const tsvColumns = introspectionResultsByKind.attribute
			.filter(attr=>attr.classId === table.id)
			.filter(attr=>attr.typeId === pgTsvType.id);

		const tsvProcs = introspectionResultsByKind.procedure
			.filter(proc=>proc.isStable)
			.filter(proc=>proc.namespaceId === table.namespaceId)
			.filter(proc=>proc.name.startsWith(`${table.name}_`))
			.filter(proc=>proc.argTypeIds.length === 1)
			.filter(proc=>proc.argTypeIds[0] === tableType.id)
			.filter(proc=>proc.returnTypeId === pgTsvType.id)
			.filter(proc=>!omit(proc, "order"));


		if (tsvColumns.length === 0 && tsvProcs.length === 0) {
			return values;
		}

		return extend(
			values,
			tsvColumns
				.concat(tsvProcs)
				.filter(attr=>pgColumnFilter(attr, build, context))
				.filter(attr=>!omit(attr, "order"))
				.reduce((memo, attr)=>{
					const fieldName = attr.kind === "procedure"
						? inflection.computedColumn(attr.name.substr(table.name.length + 1), attr, table)
						: inflection.column(attr);
					const ascFieldName = inflection.pgTsvOrderByColumnRankEnum(table, attr, true);
					const descFieldName = inflection.pgTsvOrderByColumnRankEnum(table, attr, false);

					const findExpr = ({queryBuilder})=>{
						if (!queryBuilder.__fts_ranks || !queryBuilder.__fts_ranks[fieldName]) {
							return sql.fragment`1`;
						}
						const [
							identifier,
							tsQueryString,
						] = queryBuilder.__fts_ranks[fieldName];

						// v-replaced
						//return sql.fragment`ts_rank(${identifier}, to_tsquery(${sql.value(tsQueryString)}))`;
						return sql.fragment`ts_rank(${identifier}, to_tsquery('english_nostop', ${sql.value(tsQueryString)}))`;
					};

					memo[ascFieldName] = { // eslint-disable-line no-param-reassign
						value: {
							alias: `${ascFieldName.toLowerCase()}`,
							specs: [[findExpr, true]],
						},
					};
					memo[descFieldName] = { // eslint-disable-line no-param-reassign
						value: {
							alias: `${descFieldName.toLowerCase()}`,
							specs: [[findExpr, false]],
						},
					};

					return memo;
				}, {}),
			`Adding TSV rank columns for sorting on table '${table.name}'`,
		);
	});
}