const COLUMNS_ATTRS = [ 'nullable', 'default', 'type', 'collate' ]
const COLUMN_CONSTRAINTS = [ 'unique', 'primaryKey', 'references' ]
const ALL_PROPERTIES = [ 'name', ...COLUMNS_ATTRS, ...COLUMN_CONSTRAINTS, 'force' ]

const DEFAULTS = {
  nullable: true,
  default: null,
  force: false,
  collate: null
}

module.exports = {
  DEFAULTS,
  ATTRS: COLUMNS_ATTRS,
  CONSTRAINTS: COLUMN_CONSTRAINTS,
  ALL_PROPERTIES,
}
