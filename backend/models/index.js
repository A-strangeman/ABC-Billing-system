const mongoose = require("mongoose");

// ============================================
// ITEM SCHEMA (for Bills & Drafts)
// ============================================
const ItemSchema = new mongoose.Schema({
  productName: String,
  qty: Number,
  unit: String,
  price: Number,
  amount: Number,
  
  // PLY SPECIAL FIELDS (optional)
  isPly: { type: Boolean, default: false },
  height: Number,  // e.g., 8
  width: Number,   // e.g., 4
  pieces: Number   // e.g., 5
}, { _id: false });

// ============================================
// CATEGORY SCHEMA
// ============================================
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  active: { type: Boolean, default: true }
});

// ============================================
// MATERIAL SCHEMA
// ============================================
const MaterialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  active: { type: Boolean, default: true }
});

// ============================================
// SIZE SCHEMA
// ============================================
const SizeSchema = new mongoose.Schema({
  value: { type: String, required: true },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true
  },
  active: { type: Boolean, default: true }
});

// ============================================
// FITTING SCHEMA
// ============================================
const FittingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true
  },
  active: { type: Boolean, default: true }
});

// ============================================
// CUSTOMER SCHEMA
// ============================================
const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  address: String
}, { timestamps: true });

// ============================================
// BILL SCHEMA
// ============================================
const BillSchema = new mongoose.Schema({
  estimateNo: { 
    type: Number, 
    required: true,
    unique: true
  },
  date: { 
    type: String, 
    required: true 
  },
  customer: {
    name: { type: String, required: true },
    phone: String
  },
  items: [ItemSchema],
  subTotal: Number,
  discountPercent: Number,
  discount: Number,
  total: Number,
  received: Number,
  balance: Number,
  deleted: { type: Boolean, default: false },
  deletedAt: Date
}, { timestamps: true });

// ============================================
// DRAFT SCHEMA (identical to Bill)
// ============================================
const DraftSchema = new mongoose.Schema({
  estimateNo: Number,
  date: String,
  customer: {
    name: String,
    phone: String
  },
  items: [ItemSchema],
  subTotal: Number,
  discountPercent: Number,
  discount: Number,
  total: Number,
  received: Number,
  balance: Number
}, { timestamps: true });

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

// Bill Indexes (Most Frequent Queries)
BillSchema.index({ estimateNo: 1 }, { unique: true });
BillSchema.index({ date: -1 });
BillSchema.index({ createdAt: -1 });
BillSchema.index({ 'customer.name': 1 });
BillSchema.index({ deleted: 1 });

// Customer Indexes (Autocomplete Search)
CustomerSchema.index({ name: 1 });
CustomerSchema.index({ phone: 1 });

// Catalog Indexes (Fast Filtering)
MaterialSchema.index({ categoryId: 1, active: 1 });
SizeSchema.index({ materialId: 1, active: 1 });
FittingSchema.index({ materialId: 1, active: 1 });

// Draft Indexes
DraftSchema.index({ createdAt: -1 });

// ============================================
// EXPORTS WITH OVERWRITE PROTECTION
// ============================================
module.exports = {
  Category: mongoose.models.Category || mongoose.model("Category", CategorySchema),
  Material: mongoose.models.Material || mongoose.model("Material", MaterialSchema),
  Size: mongoose.models.Size || mongoose.model("Size", SizeSchema),
  Fitting: mongoose.models.Fitting || mongoose.model("Fitting", FittingSchema),
  Customer: mongoose.models.Customer || mongoose.model("Customer", CustomerSchema),
  Bill: mongoose.models.Bill || mongoose.model("Bill", BillSchema),
  Draft: mongoose.models.Draft || mongoose.model("Draft", DraftSchema)
};