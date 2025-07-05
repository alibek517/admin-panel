const { Product } = require('../models');

const swapIds = async (req, res) => {
  try {
    const { activeId, overId } = req.body;
    console.log("Received ID swap request:", { activeId, overId });

    if (!Number.isInteger(Number(activeId)) || !Number.isInteger(Number(overId))) {
      return res.status(400).json({ error: "Invalid activeId or overId" });
    }

    if (activeId === overId) {
      return res.status(400).json({ error: "Cannot swap the same ID" });
    }

    await Product.sequelize.transaction(async (t) => {
      // Use a temporary ID to avoid primary key conflicts
      const tempId = -1; // Assuming negative IDs are not used
      await Product.update(
        { id: tempId },
        { where: { id: activeId }, transaction: t }
      );
      await Product.update(
        { id: activeId },
        { where: { id: overId }, transaction: t }
      );
      await Product.update(
        { id: overId },
        { where: { id: tempId }, transaction: t }
      );
    });

    res.status(200).json({ message: "IDs swapped successfully" });
  } catch (error) {
    console.error("Error swapping IDs:", error);
    res.status(500).json({ error: "Failed to swap IDs", details: error.message });
  }
};

module.exports = { swapIds };