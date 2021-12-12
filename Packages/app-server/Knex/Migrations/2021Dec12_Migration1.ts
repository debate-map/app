module.exports.up = async(knex: Knex)=>{
	// note: the queries below were manually run in DBeaver, rather than through knex, but they should work through knex as well
	knex.raw(`ALTER TABLE "nodeChildLinks" ADD group text NOT NULL DEFAULT 'generic'`);
	knex.raw(`update "nodeChildLinks" set "group" = 'truth' where "c_parentType" = 'claim' and "c_childType" = 'argument'`);
	knex.raw(`update "nodeChildLinks" set "group" = 'relevance' where "c_parentType" = 'argument' and "c_childType" = 'argument'`);
	knex.raw(`update "nodeChildLinks" set "group" = 'freeform' where "freeform" = true`);
	knex.raw(`ALTER TABLE "nodeChildLinks" DROP COLUMN freeform`);
};
module.exports.down = ()=>{
	throw new Error("Not implemented.");
};