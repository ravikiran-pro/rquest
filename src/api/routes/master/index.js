const express = require('express');
const { getFormTemplates, getAllCategories, updateCategoryStatus, editCategory, updateCategoryFormSchema, deleteCategory } = require('./category');
const {
  getAllSubCategories,
  updateSubCategoryStatus,
  editSubCategory,
  updateSubCategoryFormSchema,
  deleteSubCategory,
} = require('./subcategory');
const { getAllMasterShops, updateShopFormSchema, updateShopMaxSubCategories } = require('./shops');
const uploadFiles = require('./aws');
const { authMiddleware, requireAdmin } = require('../../auth');
const multer = require('multer');
const { getAllProducts, updateProductsStatus, editProducts, deleteProducts } = require('./products');


const router = express.Router();

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const upload = multer({
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    // Raster images only: SVG can carry script, so it is not accepted
    if (/^image\/(png|jpe?g|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
    return cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }));
  },
});
const singleImage = (req, res, next) =>
  upload.single('fileData')(req, res, (err) => {
    if (!err) return next();
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 400;
    const error = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller' : err.message;
    return res.status(status).json({ success: false, error });
  });

router.use(authMiddleware);

router.post('/upload', singleImage, uploadFiles);


router.get('/form_templates', getFormTemplates);

// Reads of the shared catalog are open to any signed-in user; every write is platform admin only.
router.post('/categories', getAllCategories);
router.put('/categories/status', requireAdmin, updateCategoryStatus);
router.post('/categories/create', requireAdmin, editCategory);
router.put('/categories/form_schema', requireAdmin, updateCategoryFormSchema);
router.delete('/categories', requireAdmin, deleteCategory)



router.post('/sub_categories', getAllSubCategories);
router.put('/sub_categories/status', requireAdmin, updateSubCategoryStatus);
router.post('/sub_categories/create', requireAdmin, editSubCategory);
router.put('/sub_categories/form_schema', requireAdmin, updateSubCategoryFormSchema);
router.delete('/sub_categories', requireAdmin, deleteSubCategory)


router.post('/products', getAllProducts);
router.put('/products/status', requireAdmin, updateProductsStatus);
router.post('/products/create', requireAdmin, editProducts);
router.delete('/products', requireAdmin, deleteProducts);

router.post('/shops', requireAdmin, getAllMasterShops);
router.put('/shops/form_schema', requireAdmin, updateShopFormSchema);
router.put('/shops/max_sub_categories', requireAdmin, updateShopMaxSubCategories);

module.exports = router;
