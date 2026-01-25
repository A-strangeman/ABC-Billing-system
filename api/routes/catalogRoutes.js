const express = require("express");
const router = express.Router();
const { Category, Material, Size, Fitting } = require("../models");

// ============================================
// GET ROUTES (EXISTING)
// ============================================

// GET FULL CATALOG (cached for speed)
router.get("/", async (req, res) => {
  try {
    const [categories, materials, sizes, fittings] = await Promise.all([
      Category.find({ active: true }).lean(),
      Material.find({ active: true }).lean(),
      Size.find({ active: true }).lean(),
      Fitting.find({ active: true }).lean()
    ]);

    res.json({ categories, materials, sizes, fittings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/materials/:categoryId", async (req, res) => {
  try {
    const materials = await Material.find({
      categoryId: req.params.categoryId,
      active: true
    }).lean();
    res.json(materials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/sizes/:materialId", async (req, res) => {
  try {
    const sizes = await Size.find({
      materialId: req.params.materialId,
      active: true
    }).lean();
    res.json(sizes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/fittings/:materialId", async (req, res) => {
  try {
    const fittings = await Fitting.find({
      materialId: req.params.materialId,
      active: true
    }).lean();
    res.json(fittings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST ROUTES (ADD NEW ITEMS)
// ============================================

// ADD CATEGORY
router.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category already exists
    const existing = await Category.findOne({ 
      name: name.trim(), 
      active: true 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const category = new Category({
      name: name.trim(),
      active: true
    });

    await category.save();
    res.status(201).json({ 
      success: true, 
      message: "Category added successfully",
      category 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD MATERIAL
router.post("/materials", async (req, res) => {
  try {
    const { categoryId, name } = req.body;
    
    if (!categoryId || !name || !name.trim()) {
      return res.status(400).json({ error: "Category and material name are required" });
    }

    // Verify category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if material already exists in this category
    const existing = await Material.findOne({ 
      categoryId,
      name: name.trim(), 
      active: true 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Material already exists in this category" });
    }

    const material = new Material({
      categoryId,
      name: name.trim(),
      active: true
    });

    await material.save();
    res.status(201).json({ 
      success: true, 
      message: "Material added successfully",
      material 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD SIZE
router.post("/sizes", async (req, res) => {
  try {
    const { materialId, value } = req.body;
    
    if (!materialId || !value || !value.trim()) {
      return res.status(400).json({ error: "Material and size value are required" });
    }

    // Verify material exists
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Check if size already exists for this material
    const existing = await Size.findOne({ 
      materialId,
      value: value.trim(), 
      active: true 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Size already exists for this material" });
    }

    const size = new Size({
      materialId,
      value: value.trim(),
      active: true
    });

    await size.save();
    res.status(201).json({ 
      success: true, 
      message: "Size added successfully",
      size 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD FITTING
router.post("/fittings", async (req, res) => {
  try {
    const { materialId, name } = req.body;
    
    if (!materialId || !name || !name.trim()) {
      return res.status(400).json({ error: "Material and fitting name are required" });
    }

    // Verify material exists
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Check if fitting already exists for this material
    const existing = await Fitting.findOne({ 
      materialId,
      name: name.trim(), 
      active: true 
    });
    
    if (existing) {
      return res.status(400).json({ error: "Fitting already exists for this material" });
    }

    const fitting = new Fitting({
      materialId,
      name: name.trim(),
      active: true
    });

    await fitting.save();
    res.status(201).json({ 
      success: true, 
      message: "Fitting added successfully",
      fitting 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DELETE ROUTES (SOFT DELETE)
// ============================================

// DELETE CATEGORY
router.delete("/categories/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Soft delete (set active to false)
    category.active = false;
    await category.save();

    // Also soft delete all materials in this category
    await Material.updateMany(
      { categoryId: req.params.id },
      { active: false }
    );

    res.json({ 
      success: true, 
      message: "Category deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE MATERIAL
router.delete("/materials/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Soft delete
    material.active = false;
    await material.save();

    // Also soft delete all sizes and fittings for this material
    await Promise.all([
      Size.updateMany({ materialId: req.params.id }, { active: false }),
      Fitting.updateMany({ materialId: req.params.id }, { active: false })
    ]);

    res.json({ 
      success: true, 
      message: "Material deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE SIZE
router.delete("/sizes/:id", async (req, res) => {
  try {
    const size = await Size.findById(req.params.id);
    
    if (!size) {
      return res.status(404).json({ error: "Size not found" });
    }

    // Soft delete
    size.active = false;
    await size.save();

    res.json({ 
      success: true, 
      message: "Size deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE FITTING
router.delete("/fittings/:id", async (req, res) => {
  try {
    const fitting = await Fitting.findById(req.params.id);
    
    if (!fitting) {
      return res.status(404).json({ error: "Fitting not found" });
    }

    // Soft delete
    fitting.active = false;
    await fitting.save();

    res.json({ 
      success: true, 
      message: "Fitting deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;