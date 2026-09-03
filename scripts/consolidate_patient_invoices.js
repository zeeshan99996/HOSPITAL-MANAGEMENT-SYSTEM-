const { Invoice, InvoiceItem } = require('../backend/dist/models');
const sequelize = require('../backend/dist/config/db').default;

async function consolidateInvoices() {
  const transaction = await sequelize.transaction();
  try {
    const allInvoices = await Invoice.findAll({
      order: [['patientId', 'ASC'], ['id', 'ASC']],
      transaction
    });

    const byPatient = new Map();
    for (const inv of allInvoices) {
      if (!byPatient.has(inv.patientId)) {
        byPatient.set(inv.patientId, []);
      }
      byPatient.get(inv.patientId).push(inv);
    }

    for (const [patientId, invList] of byPatient.entries()) {
      if (invList.length <= 1) continue;

      console.log(`Consolidating ${invList.length} invoices for Patient ID ${patientId}...`);
      const master = invList[0]; // First/Oldest invoice ID becomes the master
      const otherIds = invList.slice(1).map(i => i.id);

      // Move all items from duplicate invoices to master invoice
      await InvoiceItem.update(
        { invoiceId: master.id },
        { where: { invoiceId: otherIds }, transaction }
      );

      // Sum totals
      const totalPaid = invList.reduce((sum, i) => sum + Math.min(Number(i.grandTotal || i.totalAmount || 0), Number(i.paidAmount || 0)), 0);
      const totalDiscount = invList.reduce((sum, i) => sum + Number(i.discount || 0), 0);

      // Calculate total from all items now in master invoice
      const allItems = await InvoiceItem.findAll({ where: { invoiceId: master.id }, transaction });
      const computedTotal = Math.round(allItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0) * 100) / 100;
      const grandTotal = Math.round(Math.max(0, computedTotal - totalDiscount) * 100) / 100;
      const paid = Math.round(Math.min(grandTotal, totalPaid) * 100) / 100;
      const remaining = Math.max(0, grandTotal - paid);

      const status = remaining === 0 ? 'paid' : (paid > 0 ? 'partially_paid' : 'unpaid');

      await master.update({
        totalAmount: computedTotal,
        discount: totalDiscount,
        grandTotal: grandTotal,
        paidAmount: paid,
        status: status,
      }, { transaction });

      // Permanently remove the duplicate empty invoice headers
      await Invoice.destroy({
        where: { id: otherIds },
        force: true,
        transaction
      });

      console.log(`Successfully merged into Master Invoice #${master.id} (Total: ${computedTotal}, Paid: ${paid}, Remaining: ${remaining}, Status: ${status}).`);
    }

    await transaction.commit();
    console.log('All patient invoices consolidated successfully.');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to consolidate:', error);
    process.exit(1);
  }
}

consolidateInvoices();
