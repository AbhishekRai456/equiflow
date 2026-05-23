const express = require("express");
const router = express.Router();
const { getCategories } = require("../controllers/categoriesController");

// Categories are public reference data so no auth needed to read them
router.get("/", getCategories);

module.exports = router;
