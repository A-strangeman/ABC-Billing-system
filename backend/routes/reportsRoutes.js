// ============================================
// REPORTS ROUTES - OPTIMIZED with Aggregation
// backend/routes/reportsRoutes.js
// ============================================

const express = require("express");
const router = express.Router();
const { Bill } = require("../models");


// Add at the TOP of reportsRoutes.js, before other routes
router.get("/ping", (req, res) => {
  console.log("📍 Reports ping endpoint hit!");
  res.json({ 
    message: "Reports routes are working!",
    timestamp: new Date().toISOString()
  });
});


// ============================================
// GET REPORT SUMMARY - Super Fast Aggregation
// ============================================
router.get("/summary", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    // Single aggregation pipeline for all metrics
    const summary = await Bill.aggregate([
      // Filter by date and non-deleted
      { 
        $match: { 
          deleted: false,
          ...dateFilter
        } 
      },
      
      // Calculate all metrics in one go
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          totalDiscount: { $sum: "$discount" },
          totalBalance: { $sum: "$balance" },
          avgBill: { $avg: "$total" },
          uniqueCustomers: { $addToSet: "$customer.name" }
        }
      },
      
      // Project final shape
      {
        $project: {
          _id: 0,
          totalBills: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalDiscount: { $round: ["$totalDiscount", 2] },
          totalBalance: { $round: ["$totalBalance", 2] },
          avgBill: { $round: ["$avgBill", 2] },
          uniqueCustomers: { $size: "$uniqueCustomers" }
        }
      }
    ]);
    
    res.json(summary[0] || {
      totalBills: 0,
      totalRevenue: 0,
      totalDiscount: 0,
      totalBalance: 0,
      avgBill: 0,
      uniqueCustomers: 0
    });
    
  } catch (error) {
    console.error("Error in reports summary:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET REVENUE TREND - Daily aggregation
// ============================================
router.get("/revenue-trend", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    const trend = await Bill.aggregate([
      { 
        $match: { 
          deleted: false,
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: "$date",
          revenue: { $sum: "$total" },
          billCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          revenue: { $round: ["$revenue", 2] },
          billCount: 1,
          _id: 0
        }
      }
    ]);
    
    res.json(trend);
    
  } catch (error) {
    console.error("Error in revenue trend:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET TOP CUSTOMERS - Aggregated
// ============================================
router.get("/top-customers", async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query;
    
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    const customers = await Bill.aggregate([
      { 
        $match: { 
          deleted: false,
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: "$customer.name",
          totalRevenue: { $sum: "$total" },
          billCount: { $sum: 1 },
          pendingBalance: { $sum: "$balance" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          customerName: "$_id",
          totalRevenue: { $round: ["$totalRevenue", 2] },
          billCount: 1,
          pendingBalance: { $round: ["$pendingBalance", 2] },
          avgBill: { 
            $round: [{ $divide: ["$totalRevenue", "$billCount"] }, 2] 
          },
          _id: 0
        }
      }
    ]);
    
    res.json(customers);
    
  } catch (error) {
    console.error("Error in top customers:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET TOP PRODUCTS - Aggregated from items
// ============================================
router.get("/top-products", async (req, res) => {
  try {
    const { dateFrom, dateTo, limit = 10 } = req.query;
    
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    const products = await Bill.aggregate([
      { 
        $match: { 
          deleted: false,
          ...dateFilter
        } 
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productName",
          totalQuantity: { $sum: "$items.qty" },
          totalAmount: { $sum: "$items.amount" },
          occurrences: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: parseInt(limit) },
      {
        $project: {
          productName: "$_id",
          totalQuantity: { $round: ["$totalQuantity", 2] },
          totalAmount: { $round: ["$totalAmount", 2] },
          occurrences: 1,
          _id: 0
        }
      }
    ]);
    
    res.json(products);
    
  } catch (error) {
    console.error("Error in top products:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET PAYMENT STATUS - Aggregated
// ============================================
router.get("/payment-status", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    const status = await Bill.aggregate([
      { 
        $match: { 
          deleted: false,
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: null,
          fullyPaid: {
            $sum: {
              $cond: [{ $eq: ["$balance", 0] }, "$total", 0]
            }
          },
          partiallyPaid: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $gt: ["$balance", 0] },
                    { $lt: ["$balance", "$total"] }
                  ]
                },
                "$total",
                0
              ]
            }
          },
          unpaid: {
            $sum: {
              $cond: [{ $gte: ["$balance", "$total"] }, "$total", 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          fullyPaid: { $round: ["$fullyPaid", 2] },
          partiallyPaid: { $round: ["$partiallyPaid", 2] },
          unpaid: { $round: ["$unpaid", 2] }
        }
      }
    ]);
    
    res.json(status[0] || {
      fullyPaid: 0,
      partiallyPaid: 0,
      unpaid: 0
    });
    
  } catch (error) {
    console.error("Error in payment status:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET RECENT BILLS - Paginated & Lean
// ============================================
router.get("/recent-bills", async (req, res) => {
  try {
    const { dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    
    const dateFilter = {};
    if (dateFrom && dateTo) {
      dateFilter.date = {
        $gte: dateFrom,
        $lte: dateTo
      };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bills = await Bill.find(
      { deleted: false, ...dateFilter },
      { 
        estimateNo: 1,
        date: 1,
        'customer.name': 1,
        items: 1,
        subTotal: 1,
        discount: 1,
        total: 1,
        balance: 1
      }
    )
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    // Add items count
    const formattedBills = bills.map(bill => ({
      ...bill,
      itemCount: bill.items?.length || 0
    }));
    
    res.json(formattedBills);
    
  } catch (error) {
    console.error("Error in recent bills:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;