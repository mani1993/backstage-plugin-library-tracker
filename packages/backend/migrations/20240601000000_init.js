/*
 * Initial schema for the library-tracker plugin.
 * Plain CommonJS so it ships as-is and runs under knex without transpilation.
 */

/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable('library_tracker_status', table => {
    table.string('entity_ref').primary();
    table.string('owner');
    table.text('source_url');
    table.string('provider');
    table.string('last_etag');
    table.string('last_scanned_at');
    table.string('last_outcome').notNullable();
    table.text('last_error');
  });

  await knex.schema.createTable('library_tracker_runs', table => {
    table.string('id').primary();
    table.string('trigger').notNullable();
    table.string('started_at').notNullable();
    table.string('finished_at');
    table.integer('scanned').notNullable().defaultTo(0);
    table.integer('skipped').notNullable().defaultTo(0);
    table.integer('failed').notNullable().defaultTo(0);
    table.text('summary');
  });

  await knex.schema.createTable('library_tracker_dependencies', table => {
    table.string('id').primary();
    table.string('entity_ref').notNullable().index();
    table.string('owner').index();
    table.string('ecosystem').notNullable();
    table.text('manifest_path').notNullable();
    table.string('name').notNullable().index();
    table.string('declared_version');
    table.string('scope');
    table.string('license');
    table.string('latest_version');
    table.string('drift_severity').index();
    table.boolean('used');
    table.float('confidence');
    table.boolean('unused');
  });

  await knex.schema.createTable('library_tracker_occurrences', table => {
    table.increments('id').primary();
    table
      .string('dependency_id')
      .notNullable()
      .index()
      .references('id')
      .inTable('library_tracker_dependencies')
      .onDelete('CASCADE');
    table.text('file_path').notNullable();
    table.integer('line').notNullable();
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('library_tracker_occurrences');
  await knex.schema.dropTableIfExists('library_tracker_dependencies');
  await knex.schema.dropTableIfExists('library_tracker_runs');
  await knex.schema.dropTableIfExists('library_tracker_status');
};
