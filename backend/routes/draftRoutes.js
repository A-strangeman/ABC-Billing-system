const express = require("express");
const router = express.Router();
const { Draft } = require("../models");

// CREATE DRAFT
router.post("/", async (req, res) => {
  try {
    const draft = new Draft(req.body);
    await draft.save();
    
    res.json({ 
      success: true, 
      draftId: draft._id,
      message: "Draft saved" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE DRAFT
router.put("/:draftId", async (req, res) => {
  try {
    const draft = await Draft.findByIdAndUpdate(
      req.params.draftId,
      req.body,
      { new: true }
    );
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    res.json({ 
      success: true, 
      draftId: draft._id,
      message: "Draft updated" 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET ALL DRAFTS
router.get("/", async (req, res) => {
  try {
    const drafts = await Draft.find()
      .sort({ createdAt: -1 })
      .lean();
    
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET SINGLE DRAFT
router.get("/:draftId", async (req, res) => {
  try {
    const draft = await Draft.findById(req.params.draftId).lean();
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    res.json(draft);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE DRAFT
router.delete("/:draftId", async (req, res) => {
  try {
    const draft = await Draft.findByIdAndDelete(req.params.draftId);
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    res.json({ message: "Draft deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;