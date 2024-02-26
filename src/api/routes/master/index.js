const express = require('express');
const { getAllCategories, updateCategoryStatus, editCategory, deleteCategory } = require('./category');
const { getAllSubCategories, updateSubCategoryStatus, editSubCategory, deleteSubCategory } = require('./subcategory');
const uploadFiles = require('./aws');
const { authMiddleware } = require('../../auth');
const multer = require('multer');
const { getAllProducts, updateProductsStatus, editProducts, deleteProducts } = require('./products');


const router = express.Router();

const upload = multer();
router.post('/upload', upload.single('fileData'), uploadFiles);


router.use(authMiddleware);


router.post('/categories', getAllCategories);
router.put('/categories/status', updateCategoryStatus);
router.post('/categories/create', editCategory);
router.delete('/categories', deleteCategory)



router.post('/sub_categories', getAllSubCategories);
router.put('/sub_categories/status', updateSubCategoryStatus);
router.post('/sub_categories/create', editSubCategory);
router.delete('/sub_categories', deleteSubCategory)


router.post('/products', getAllProducts);
router.put('/products/status', updateProductsStatus);
router.post('/products/create', editProducts);
router.delete('/products', deleteProducts)


module.exports = router;
