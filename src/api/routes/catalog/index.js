/**
 * Master catalog API (/api/v1/catalog).
 *
 * The `catalog` schema is written by the pipeline in catalog/ (npm run catalog:load) and
 * lives in the app's own database. Until `npm run catalog:migrate` has run, every endpoint
 * here answers 503 (see requireCatalog in ./db.js).
 *
 *   owner (any signed-in user):    GET  /search (?shop_id= / ?sub_category_id= rank the
 *                                  items linked to that sub-category first), POST /import
 *   platform admin (role check):   GET  /meta, GET|POST /items (?sub_category_id=),
 *                                  GET|PUT /items/:id, DELETE /items/:id,
 *                                  POST /items/:id/restore, GET /taxonomy, GET /brands,
 *                                  GET /hsn, GET /sub-category-coverage
 */
const express = require('express');
const { authMiddleware, requireAdmin } = require('../../auth');
const { requireCatalog } = require('./db');
const ownerRouter = require('./owner');
const adminRouter = require('./admin');

const router = express.Router();

router.use(authMiddleware);
router.use(ownerRouter);
router.use(requireAdmin);
router.use(requireCatalog);
router.use(adminRouter);

module.exports = router;
