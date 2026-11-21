/**
 * Rebuilds catalog_item_sub_categories from the catalogue's own rule (the same rule as
 * catalog/search): an item is linked to a sub-category when its taxonomy node is one of the
 * sub-category's catalog_nodes or a descendant of one, or when its attributes.shop_type equals
 * the sub-category key. Rows added by hand (source <> 'rule') are kept.
 *
 * Needed when the catalogue is loaded after the app migration ran (the migration only
 * backfills when the catalog schema already exists). Safe to run any number of times.
 */
async function rebuildCatalogSubCategoryLinks(sequelize, { transaction } = {}) {
  const [exists] = await sequelize.query("SELECT (to_regclass('catalog.items') IS NOT NULL) AS ok", {
    transaction,
    type: sequelize.QueryTypes.SELECT,
  });
  if (!exists.ok) return { skipped: true, linked: 0 };

  await sequelize.query("DELETE FROM catalog_item_sub_categories WHERE source = 'rule'", { transaction });
  await sequelize.query(
    `INSERT INTO catalog_item_sub_categories (catalog_item_id, sub_category_id, source)
     WITH RECURSIVE tree(sub_id, node_id) AS (
       SELECT s.id, r.node
         FROM sub_categories s
         CROSS JOIN LATERAL jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(s.catalog_nodes) = 'array' THEN s.catalog_nodes ELSE '[]'::jsonb END
         ) AS r(node)
        WHERE r.node LIKE '%:%'
       UNION
       SELECT t.sub_id, n.id FROM tree t JOIN catalog.taxonomy_nodes n ON n.parent_id = t.node_id
     )
     SELECT DISTINCT i.id, t.sub_id, 'rule' FROM tree t JOIN catalog.items i ON i.taxonomy_node_id = t.node_id
     UNION
     SELECT DISTINCT i.id, s.id, 'rule' FROM sub_categories s
       JOIN catalog.items i ON i.attributes->>'shop_type' = s.key
      WHERE s.key IS NOT NULL
     ON CONFLICT (catalog_item_id, sub_category_id) DO UPDATE SET source = 'rule', updated_at = now()`,
    { transaction }
  );
  const [row] = await sequelize.query('SELECT count(*)::int AS n FROM catalog_item_sub_categories', {
    transaction,
    type: sequelize.QueryTypes.SELECT,
  });
  return { skipped: false, linked: row.n };
}

module.exports = { rebuildCatalogSubCategoryLinks };
