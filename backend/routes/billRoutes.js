const express = require("express");
const router = express.Router();
const { Bill } = require("../models");

router.get("/next-invoice", async (req, res) => {
  try {
    const lastBill = await Bill.findOne({ deleted: false })
      .sort({ estimateNo: -1 })
      .select('estimateNo')
      .lean();
    const nextNumber = lastBill ? lastBill.estimateNo + 1 : 1;
    res.json({ nextInvoiceNo: nextNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const exists = await Bill.findOne({ 
      estimateNo: req.body.estimateNo,
      deleted: false 
    });
    
    if (exists) {
      return res.status(400).json({ 
        error: "Invoice number already exists" 
      });
    }

    const bill = new Bill(req.body);
    await bill.save();
    
    res.status(201).json({ message: "Bill saved", bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      Bill.find({ deleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Bill.countDocuments({ deleted: false })
    ]);

    res.json({
      bills,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOne({ 
      _id: req.params.id,
      deleted: false 
    }).lean();
    
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/price-history/:productName", async (req, res) => {
  try {
    const productName = decodeURIComponent(req.params.productName);

    const bills = await Bill.find({
      "items.productName": productName,
      deleted: false
    })
    .select('items createdAt')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    const priceHistory = [];
    const seenPrices = new Set();
    
    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.productName === productName && !seenPrices.has(item.price)) {
          seenPrices.add(item.price);
          priceHistory.push({
            price: item.price,
            unit: item.unit,
            date: bill.createdAt
          });
          if (priceHistory.length >= 5) break;
        }
      }
      if (priceHistory.length >= 5) break;
    }

    res.json(priceHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, deleted: false },
      req.body,
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill updated", bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FIXED DELETE ROUTE
router.delete("/:id", async (req, res) => {
  try {
    console.log("🗑️ Deleting bill:", req.params.id);
    
    // First check if bill exists
    const existingBill = await Bill.findById(req.params.id);
    
    if (!existingBill) {
      console.log("❌ Bill not found:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: "Bill not found" 
      });
    }
    
    // Check if already deleted
    if (existingBill.deleted) {
      console.log("⚠️ Bill already deleted:", req.params.id);
      return res.status(400).json({ 
        success: false,
        message: "Bill already deleted" 
      });
    }
    
    // Perform soft delete
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      { 
        deleted: true, 
        deletedAt: new Date() 
      },
      { new: true }
    );

    console.log("✅ Bill soft deleted successfully:", bill.estimateNo);
    
    res.json({ 
      success: true,
      message: "Bill deleted successfully",
      billId: bill._id,
      estimateNo: bill.estimateNo
    });
    
  } catch (error) {
    console.error("❌ Error deleting bill:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;