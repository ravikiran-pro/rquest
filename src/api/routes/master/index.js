const express = require('express');
const { getAllCategories, updateCategoryStatus, editCategory } = require('./category');
const { getAllSubCategories, updateSubCategoryStatus, editSubCategory } = require('./subcategory');

const router = express.Router();

router.post('/categories', getAllCategories);
router.put('/categories/status', updateCategoryStatus);
router.post('/categories/create', editCategory);


router.post('/sub_categories', getAllSubCategories);
router.put('/sub_categories/status', updateSubCategoryStatus);
router.post('/sub_categories/create', editSubCategory);

module.exports = router;
