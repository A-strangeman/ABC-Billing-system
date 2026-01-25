// ============================================
// DATABASE SEED SCRIPT
// backend/seed.js
// ============================================

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Category, Material, Size, Fitting } = require("./models");

dotenv.config();

const seedData = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // 1. Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Category.deleteMany({});
    await Material.deleteMany({});
    await Size.deleteMany({});
    await Fitting.deleteMany({});

    // ============================================
    // 2. DATA DEFINITION (Extracted from bill.html)
    // ============================================

    const dataTree = {
      "Plumbing": {
        materials: {
          "CPVC": {
            sizes: ["3/4\"", "1\"", "1.5\""],
            fittings: ["pipe", "Elbow", "Tee", "Union", "45°", "Gate Valve", "Socket", "Reducer", "End Cap", "Female Socket", "Female Elbow", "Female Tee", "Male Socket", "Long-Plug", "Reducer Elbow", "Reducer Tee", "Over bend", "Cross Tee", "Tank Nipple", "Mixer Adapter", "Solvent"]
          },
          "PVC": {
            sizes: ["1.5\"", "2.5\"", "4\"", "6\""],
            fittings: ["pipe", "Elbow", "Tee", "45°", "Socket", "Reducer", "End Cap", "P-Trap", "Trap", "Reducer Elbow", "Reducer Tee", "Jali", "Door Elbow", "Door Tee", "Solvent"]
          },
          "Black": {
            sizes: ["3\"", "4\"", "6\""],
            fittings: ["pipe", "Elbow", "Tee", "Socket", "Jali", "pain Sheet", "Solvent"]
          },
          "GI": {
            sizes: ["1/2\"", "3/4\"", "1\"", "1.5\"", "2\"", "M-seal"],
            fittings: ["pipe", "Nipple", "Elbow", "Tee", "Union", "45°", "Gate Valve", "Socket", "Reducer", "End Cap", "Female Socket", "Female Elbow", "Female Tee", "Male Socket", "Reducer Elbow", "Reducer Tee", "Tank Nipple"]
          },
          "Tank": {
            sizes: ["200L", "500L", "750L", "1000L"],
            fittings: []
          },
          "Passion": {
            sizes: ["Wall Mixer", "Bib-Cock", "Angle-Cock", "Swan Neck", "Long Body", "Piller Cock", "Non-Telephone", "Gun", "Shower", "CV fringes"],
            fittings: []
          },
          "Pani Tape": { sizes: [], fittings: [] },
          "Cutting Blade": { sizes: [], fittings: [] },
          "J-hook": { sizes: [], fittings: [] },
          "Concealed": { sizes: [], fittings: [] },
          "Connection Pipe": { sizes: [], fittings: [] },
          "Comod": { sizes: [], fittings: [] },
          "Basin": { sizes: [], fittings: [] },
          "Pain Sheet": { sizes: [], fittings: [] }
        }
      },
      "Wiring": {
        materials: {
          "Wire": {
            sizes: ["Rathi Gold", "Rathi RC", "Copper", "meter_wire"],
            fittings: ["0.75\"", "1\"", "1.5\"", "2.5\"", "4\"", "6\"", "10\""]
          },
          "Switch board": {
            sizes: ["Gold", "Platinium", "MG-Gold", "Heavy"],
            fittings: ["5X3 4-Gang", "5X3 6-Gang", "5X3 8-Gang", "5X3 10-Gang", "3X3 4-Gang", "3X3 3-Gang", "3X3 2-Gang", "3X3 1-Gang", "3X3 Power-Socket", "3X5 Double Power-Socket", "3X3 main Switch", "3X5 main Switch"]
          },
          "Modular": {
            sizes: ["6A", "16A", "20A", "32A", "3X3 plate", "4X3 plate", "5X3 plate", "7X3 plate", "8X4 plate", "5X5 plate"],
            fittings: ["Switch", "Indicator", "5-pin", "2-Pin", "Fan Regulator"]
          },
          "Box": {
            sizes: ["3X3 Mounting", "3X5 Mounting", "3X3 Surface", "3X5 Surface", "PVC 4X4", "Plate 4X4", "PVC 7X4", "Plate 12X8"],
            fittings: []
          },
          "MCB": {
            sizes: ["SP", "DP"],
            fittings: ["6A", "10A", "16A", "20A", "32A", "40A"]
          },
          "MCB-Box": {
            sizes: ["2-Way", "6-Way", "8-Way", "10-Way", "12-Way", "14-Way", "16-Way", "20-Way TPN"],
            fittings: []
          },
          "Pipe": {
            sizes: ["Black 16mm", "Black 20mm", "Black NS 16mm", "Black NS 20mm", "white NS 20mm", "White NS 16mm"],
            fittings: []
          },
          "Single": {
            sizes: ["Switch", "5-Pin Socket", "2-pin Socket", "Indicator", "Fuse", "Regulator"],
            fittings: []
          },
          "Wire Beet": {
            sizes: ["16mm", "20mm", "25mm", "30mm", "35MM"],
            fittings: []
          },
          "Screw": {
            sizes: ["3/4\"", "1\"", "1.5\"", "2\"", "2.5\"", "3\"", "4\"", "6\""],
            fittings: []
          },
          "Fiber-plate": {
            sizes: ["4x4", "5x5", "7x4", "7X5", "12X8"],
            fittings: []
          },
          "Cutting Blade": { sizes: [], fittings: [] },
          "J-hook": { sizes: [], fittings: [] },
          "Tape": { sizes: [], fittings: [] },
          "GI-Wire": { sizes: [], fittings: [] }
        }
      },
      "TMT": {
        materials: {
          "4mm TMT": { sizes: [], fittings: [] },
          "7mm TMT": { sizes: [], fittings: [] },
          "8mm TMT": { sizes: [], fittings: [] },
          "10mm TMT": { sizes: [], fittings: [] },
          "12mm TMT": { sizes: [], fittings: [] },
          "16mm TMT": { sizes: [], fittings: [] },
          "Cutting Blade": { sizes: [], fittings: [] },
          "22-Guage Wire": { sizes: [], fittings: [] },
          "7X7 Ring": { sizes: [], fittings: [] },
          "7X4 Ring": { sizes: [], fittings: [] },
          "3X3 Ring": { sizes: [], fittings: [] },
          "Kalampu": { sizes: [], fittings: [] }
        }
      },
      "Cement": {
        materials: {
          "43 maruti cement OPC": { sizes: [], fittings: [] },
          "maruti cement PPC": { sizes: [], fittings: [] },
          "53 maruti cement OPC": { sizes: [], fittings: [] },
          "cement OPC": { sizes: [], fittings: [] },
          "cement PPC": { sizes: [], fittings: [] },
          "Dr.fixit 20L": { sizes: [], fittings: [] },
          "Dr.fixit 10L": { sizes: [], fittings: [] },
          "Dr.fixit 5L": { sizes: [], fittings: [] },
          "Dr.fixit 1L": { sizes: [], fittings: [] }
        }
      },
      "Paint": {
        materials: {
          "Jenosolin": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "BP Exterior": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "BP Interior": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Exterior A-Guard Primer": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "All Guard": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Walmasta": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Silk": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Easy Clean": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Bison": { sizes: ["20L", "10L", "4L", "1L"], fittings: [] },
          "Berger Gold": { sizes: ["1L", "1/2L"], fittings: [] },
          "Brolac": { sizes: ["4L", "1L", "1/2L"], fittings: [] },
          "Umbrella": { sizes: ["4L", "1L", "1/2L"], fittings: [] },
          "Enamel": { sizes: ["4L", "1L", "1/2L"], fittings: [] },
          "Metal Primer": { sizes: ["4L", "1L", "1/2L"], fittings: [] },
          "Wood Primer": { sizes: ["4L", "1L", "1/2L"], fittings: [] },
          "Brush": { sizes: ["5\"", "4\"", "3\"", "2.5\"", "2\"", "1.5\"", "1\"", "1/2\"", "kalam"], fittings: [] },
          "Roller": { sizes: ["9\"", "8\"", "6\"", "4\"", "2\"", "Designing"], fittings: [] },
          "Putty": { sizes: ["Interior", "Exterior", "Blade 8\"", "Blade 4\"", "Blade"], fittings: [] },
          "Tarpin Oil": { sizes: [], fittings: [] },
          "Spray": { sizes: [], fittings: [] },
          "Tube": { sizes: [], fittings: [] },
          "Colourent": { sizes: [], fittings: [] },
          "Masking Tape": { sizes: [], fittings: [] }
        }
      },
      "Tin": {
        materials: {
          "Aarti Color": { 
            sizes: ["36mm", "30mm", "24mm", "19mm", "42mm"], 
            fittings: ["6Ft", "7Ft", "8Ft", "9Ft", "10Ft", "12Ft"] 
          },
          "Aarti White": { 
            sizes: ["42mm", "39mm", "36mm", "32mm", "30mm", "26mm", "24mm", "19mm", "13mm"], 
            fittings: ["6Ft", "7Ft", "8Ft", "9Ft", "10Ft", "12Ft"] 
          },
          "Maigra": { sizes: ["Color 6Ft", "Color 8Ft", "White 6Ft", "White 8Ft"], fittings: [] },
          "Nails": { sizes: ["1\"", "1.5\"", "2\"", "2.5\"", "3\"", "4\"", "5\""], fittings: [] },
          "Hilti Screw": { sizes: ["19mm", "25mm", "35mm", "45mm"], fittings: [] },
          "Tin": { sizes: [], fittings: [] },
          "3ft Plain Sheet Color": { sizes: [], fittings: [] },
          "4ft Plain Sheet Color": { sizes: [], fittings: [] },
          "3ft Plain Sheet Tin": { sizes: [], fittings: [] },
          "3ft Plain Sheet Aluminium": { sizes: [], fittings: [] },
          "2.5ft Plain Sheet Aluminium": { sizes: [], fittings: [] },
          "Tin Killa": { sizes: [], fittings: [] },
          "pattar": { sizes: [], fittings: [] },
          "Nut-bolt": { sizes: [], fittings: [] }
        }
      },
      "Ply": {
        materials: {
          "18mm": { 
            sizes: ["(8X4)", "(7X4)", "(6X4)", "(5X4)", "(8X3)", "(7X3)", "(6X3)", "(5X3)"], 
            fittings: ["1", "2", "3", "4", "5", "6", "10", "20", "30", "40"] // Abbreviated from list
          },
          "12mm": { sizes: ["(8X4)", "(7X4)", "(6X4)", "(5X4)", "(8X3)", "(7X3)", "(6X3)", "(5X3)"], fittings: ["1", "5", "10"] },
          "10mm": { sizes: ["(8X4)", "(7X4)", "(6X4)", "(5X4)", "(8X3)", "(7X3)", "(6X3)", "(5X3)"], fittings: ["1", "5", "10"] },
          "6mm": { sizes: ["(8X4)", "(7X4)", "(6X4)", "(5X4)", "(8X3)", "(7X3)", "(6X3)", "(5X3)"], fittings: ["1", "5", "10"] },
          "Fevicol": { sizes: ["1/2", "1"], fittings: [] },
          "Heatex": { sizes: ["1/2", "1", "2", "5"], fittings: [] },
          "Beet": { sizes: ["Wood", "Plastic"], fittings: ["Mandir", "Channel", "L"] },
          "pin Killa": { sizes: [], fittings: [] },
          "Formica": { sizes: [], fittings: [] },
          "Chalk Powder": { sizes: [], fittings: [] },
          "Brown Powder": { sizes: [], fittings: [] },
          "Varnish": { sizes: [], fittings: [] }
        }
      },
      "Tile": {
        materials: {
          "12X12 Tile": { sizes: [], fittings: [] },
          "12X18 Tile": { sizes: [], fittings: [] },
          "24X24 Tile": { sizes: [], fittings: [] },
          "Sckating Tile": { sizes: [], fittings: [] },
          "Groot": { sizes: [], fittings: [] }
        }
      },
      "Pipe": {
        materials: {
          "20mm NS White": { sizes: [], fittings: [] },
          "16mm NS White": { sizes: [], fittings: [] },
          "20mm NS Black": { sizes: [], fittings: [] },
          "16mm NS Black": { sizes: [], fittings: [] },
          "20mm Black": { sizes: [], fittings: [] },
          "16mm Black": { sizes: [], fittings: [] },
          "Point-box": { sizes: [], fittings: [] },
          "Tape": { sizes: [], fittings: [] }
        }
      },
      "Door": {
        materials: {
          "25 Digital": { sizes: ["80X32", "80X34", "80X36", "72X32"], fittings: [] },
          "32 Digital": { sizes: ["80X32", "80X34", "80X36", "72X32"], fittings: [] },
          "25 PVC": { sizes: ["80X32", "80X34", "80X36", "72X32"], fittings: [] },
          "32 PVC": { sizes: ["80X32", "80X34", "80X36", "72X32"], fittings: [] }
        }
      }
    };

    // ============================================
    // 3. EXECUTION LOOP
    // ============================================

    for (const [catName, catData] of Object.entries(dataTree)) {
      const category = await Category.create({ name: catName });
      console.log(`📂 Category: ${catName}`);

      for (const [matName, matDetails] of Object.entries(catData.materials)) {
        const material = await Material.create({
          name: matName,
          categoryId: category._id
        });

        // Create Sizes
        if (matDetails.sizes.length > 0) {
          for (const sizeVal of matDetails.sizes) {
            await Size.create({ value: sizeVal, materialId: material._id });
          }
        }

        // Create Fittings
        if (matDetails.fittings.length > 0) {
          for (const fitName of matDetails.fittings) {
            await Fitting.create({ name: fitName, materialId: material._id });
          }
        }
      }
    }

    console.log("🎉 Database seeded successfully with all categories!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seed Error:", error);
    process.exit(1);
  }
};

seedData();