import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Modal, Drawer, Badge } from '../components/UI';
import { Pill, Plus, ShoppingBag, Trash, HelpCircle, Package, Layers, CalendarRange, Edit2 } from 'lucide-react';

export const Pharmacy: React.FC = () => {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals controls
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSaleOpen, setIsSaleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);

  // Add Medicine Form State
  const [medName, setMedName] = useState('');
  const [medCat, setMedCat] = useState('Antibiotic');
  const [medStock, setMedStock] = useState(100);
  const [medBatch, setMedBatch] = useState('');
  const [medExpiry, setMedExpiry] = useState('');
  const [medPrice, setMedPrice] = useState(500);
  const [medSupplier, setMedSupplier] = useState('');
  const [medUnit, setMedUnit] = useState('vial');
  const [medThreshold, setMedThreshold] = useState(20);

  // Edit Medicine Form State
  const [editStock, setEditStock] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editThreshold, setEditThreshold] = useState(20);
  const [editUnit, setEditUnit] = useState('vial');

  // OTC Sale POS State
  const [patientId, setPatientId] = useState('');
  const [saleItems, setSaleItems] = useState<Array<{ medicineId: string; quantity: number }>>([
    { medicineId: '', quantity: 1 }
  ]);

  const fetchPharmacyData = async () => {
    setLoading(true);
    try {
      const medList = await apiClient.get('/medicines');
      setMedicines(medList);

      if (user?.role === 'pharmacist' || user?.role === 'admin' || user?.role === 'accountant') {
        const patientList = await apiClient.get('/patients');
        setPatients(patientList);
      }
    } catch (err) {
      console.error('Error fetching pharmacy records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacyData();
  }, [user]);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/medicines', {
        name: medName,
        category: medCat,
        stockLevel: medStock,
        batchNumber: medBatch,
        expiryDate: medExpiry,
        price: medPrice,
        supplierName: medSupplier,
        unit: medUnit,
        lowStockThreshold: medThreshold,
      });
      setIsAddOpen(false);
      fetchPharmacyData();
      // Reset
      setMedName('');
      setMedBatch('');
      setMedExpiry('');
      setMedSupplier('');
      setMedStock(100);
      setMedPrice(500);
      setMedUnit('vial');
      setMedThreshold(20);
    } catch (err) {
      alert('Error adding medicine supply.');
    }
  };

  const handleEditClick = (med: any) => {
    setSelectedMed(med);
    setEditStock(med.stockLevel);
    setEditPrice(Number(med.price));
    setEditThreshold(med.lowStockThreshold || 20);
    setEditUnit(med.unit || 'vial');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;

    try {
      await apiClient.put(`/medicines/${selectedMed.id}`, {
        stockLevel: Number(editStock),
        price: Number(editPrice),
        lowStockThreshold: Number(editThreshold),
        unit: editUnit,
      });
      setIsEditOpen(false);
      fetchPharmacyData();
      alert('Stock catalog updated successfully.');
    } catch (err) {
      alert('Failed to update stock items.');
    }
  };

  const handleSaleChange = (index: number, field: string, value: string | number) => {
    const updated = [...saleItems];
    updated[index] = { ...updated[index], [field]: value };
    setSaleItems(updated);
  };

  const handleAddSaleRow = () => {
    setSaleItems([...saleItems, { medicineId: '', quantity: 1 }]);
  };

  const handleRemoveSaleRow = (index: number) => {
    const updated = saleItems.filter((_, i) => i !== index);
    setSaleItems(updated.length > 0 ? updated : [{ medicineId: '', quantity: 1 }]);
  };

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/medicines/sale', {
        patientId,
        items: saleItems.filter(item => item.medicineId !== '')
      });
      setIsSaleOpen(false);
      fetchPharmacyData();
      // Reset
      setPatientId('');
      setSaleItems([{ medicineId: '', quantity: 1 }]);
      alert('Pharmacy sale completed successfully. Billing invoice generated.');
    } catch (err: any) {
      alert(err.message || 'Failed to complete pharmacy sale.');
    }
  };

  // Stock Stats Calculations
  const totalItemsCount = medicines.length;
  const lowStockCount = medicines.filter(m => m.stockLevel <= (m.lowStockThreshold || 20)).length;
  const nearExpiryCount = medicines.filter(m => {
    const expDate = new Date(m.expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return expDate <= threeMonths;
  }).length;

  const canEdit = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'pharmacist';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pharmacy Dispensary</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Dispense prescription medications, record direct sales, and configure pre-defined unit rates.</p>
        </div>
        {(user?.role === 'pharmacist' || user?.role === 'admin' || user?.role === 'accountant') && (
          <div className="flex gap-2.5 self-start sm:self-center">
            {user?.role === 'pharmacist' && (
              <Button onClick={() => setIsSaleOpen(true)} variant="outline" className="flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4" /> OTC Dispense sale
              </Button>
            )}
            <Button onClick={() => setIsAddOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> Add Meds Stock
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="flex items-center gap-4 py-4 border border-slate-200/60 dark:border-slate-850">
          <div className="p-2.5 bg-brand-500/10 text-brand-600 rounded-xl">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Total Formulas</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{totalItemsCount} Types</span>
          </div>
        </Card>
        <Card className="flex items-center gap-4 py-4 border border-slate-200/60 dark:border-slate-850">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Low Stock Warnings</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{lowStockCount} Items</span>
          </div>
        </Card>
        <Card className="flex items-center gap-4 py-4 border border-slate-200/60 dark:border-slate-850">
          <div className="p-2.5 bg-rose-500/10 text-rose-555 rounded-xl">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block uppercase tracking-wider">Near Expiry (90d)</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100">{nearExpiryCount} Batches</span>
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 dark:bg-dark-900 rounded-lg" />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-slate-550 dark:text-slate-400">Inventory is empty.</p>
        </Card>
      ) : (
        /* Medicine Inventory Grid Table */
        <Card className="overflow-x-auto p-0 border border-slate-200 dark:border-slate-850">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-950/20 text-slate-450 uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3.5">Name / Formula</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Stock Level</th>
                <th className="px-6 py-3.5">Batch / Expiry</th>
                <th className="px-6 py-3.5">Preconfigured Unit Price</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                {canEdit && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
              {medicines.map(med => {
                const threshold = med.lowStockThreshold || 20;
                const isLow = med.stockLevel <= threshold;
                const expDate = new Date(med.expiryDate);
                const nearExp = expDate <= new Date(new Date().setDate(new Date().getDate() + 90));
                
                return (
                  <tr key={med.id} className="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-dark-900/50">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${isLow ? 'bg-amber-500' : 'bg-brand-500'}`} />
                      {med.name}
                    </td>
                    <td className="px-6 py-4">{med.category}</td>
                    <td className={`px-6 py-4 font-mono font-bold ${isLow ? 'text-amber-500' : 'text-slate-800 dark:text-slate-250'}`}>
                      {med.stockLevel} {med.unit || 'units'}
                      {isLow && <span className="block text-[8px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">Threshold: {threshold}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold block">{med.batchNumber}</span>
                      <span className={`text-[10px] ${nearExp ? 'text-rose-500' : 'text-slate-450'} mt-0.5`}>Exp: {med.expiryDate}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-slate-150">Rs. {Number(med.price).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {isLow ? (
                        <Badge type="warning">Low Stock</Badge>
                      ) : nearExp ? (
                        <Badge type="error">Expiring</Badge>
                      ) : (
                        <Badge type="success">Good Stock</Badge>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditClick(med)}
                          className="inline-flex items-center gap-1 p-1 px-2.5 bg-slate-100 dark:bg-dark-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-850 rounded hover:bg-slate-200 transition-colors text-[10px] font-bold"
                        >
                          <Edit2 className="h-3 w-3" /> Rates & Stock
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Medicine Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Restock Pharmacy Formulas">
        <form onSubmit={handleAddMedicine} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Medicine Name / Injection Formula" required value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Injection Ceftriaxone 1g" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Therapeutic Category</label>
              <select
                value={medCat}
                onChange={e => setMedCat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Analgesic">Analgesic</option>
                <option value="Antidiabetic">Antidiabetic</option>
                <option value="Antihistamine">Antihistamine</option>
                <option value="Antibiotic Injection">Antibiotic Injection</option>
                <option value="Steroid Injection">Steroid Injection</option>
                <option value="Analgesic Injection">Analgesic Injection</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input label="Stock Level" type="number" required value={medStock} onChange={e => setMedStock(Number(e.target.value))} />
              <Input label="Unit type (e.g. ml, tab)" required value={medUnit} onChange={e => setMedUnit(e.target.value)} placeholder="e.g. vial" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Batch Number" required value={medBatch} onChange={e => setMedBatch(e.target.value)} placeholder="BAT-2026-X" />
            <Input label="Expiry Date" type="date" required value={medExpiry} onChange={e => setMedExpiry(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Preconfigured Cost (Rs.)" type="number" step="0.01" required value={medPrice} onChange={e => setMedPrice(Number(e.target.value))} />
            <Input label="Low Stock Warning Limit" type="number" required value={medThreshold} onChange={e => setMedThreshold(Number(e.target.value))} />
          </div>
          
          <Input label="Supplier distributor" value={medSupplier} onChange={e => setMedSupplier(e.target.value)} placeholder="e.g. PharmaCorp Inc." />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit">Commit Inventory Restock</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Medicine Stock Level / Rates Config Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={selectedMed ? `Configure Rates & Stock: ${selectedMed.name}` : 'Edit Rates'}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Stock Quantity Level" required type="number" value={editStock} onChange={e => setEditStock(Number(e.target.value))} />
            <Input label="Stock Unit Label" required value={editUnit} onChange={e => setEditUnit(e.target.value)} placeholder="e.g. vial, tab" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Pre-defined Cost per Unit (Rs.)" required type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} />
            <Input label="Low Stock Warning Threshold" required type="number" value={editThreshold} onChange={e => setEditThreshold(Number(e.target.value))} />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit">Save Stock Configuration</Button>
          </div>
        </form>
      </Modal>

      {/* Direct OTC Medicine Sale Checkout (POS) Drawer */}
      <Drawer isOpen={isSaleOpen} onClose={() => setIsSaleOpen(false)} title="OTC Pharmacy Dispensary POS">
        <form onSubmit={handleSaleSubmit} className="space-y-5">
          {/* Patient Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-650 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Select Buyer Patient File</label>
            <select
              required
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-350 dark:border-slate-800 text-sm bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
              ))}
            </select>
          </div>

          {/* POS Cart items */}
          <div className="space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Prescription Cart Items</span>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSaleRow}>Add Drug</Button>
            </div>

            {saleItems.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2.5 items-end bg-slate-50 dark:bg-dark-950/20 p-3 rounded-lg border border-slate-200 dark:border-slate-850 relative pr-8 w-full">
                {saleItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSaleRow(index)}
                    className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">Medicine</label>
                  <select
                    required
                    value={item.medicineId}
                    onChange={e => handleSaleChange(index, 'medicineId', e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-850 text-xs bg-white dark:bg-dark-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500"
                  >
                    <option value="">-- Choose Formula --</option>
                    {medicines.filter(m => m.stockLevel > 0).map(m => (
                      <option key={m.id} value={m.id}>{m.name} (Rs. {Number(m.price).toLocaleString()} - Stock: {m.stockLevel} {m.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-20">
                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={e => handleSaleChange(index, 'quantity', Number(e.target.value))}
                    className="!py-1.5 !px-2.5 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsSaleOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" /> Issue Billing & Dispense</Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};
