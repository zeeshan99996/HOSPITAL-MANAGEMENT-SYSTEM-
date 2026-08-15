import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Modal, Badge } from '../components/UI';
import {
  Stethoscope,
  ClipboardList,
  TestTube2,
  Salad,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  BookOpen
} from 'lucide-react';

interface TemplateItem {
  id: number;
  doctorId?: number | null;
  category: 'symptom' | 'diagnosis' | 'lab_test' | 'advice';
  title: string;
  details?: string | null;
  displayOrder?: number;
}

export const ClinicalTemplates: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'symptom' | 'diagnosis' | 'lab_test' | 'advice'>('symptom');
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<{
    symptoms: TemplateItem[];
    diagnoses: TemplateItem[];
    lab_tests: TemplateItem[];
    advice: TemplateItem[];
    all: TemplateItem[];
  }>({
    symptoms: [],
    diagnoses: [],
    lab_tests: [],
    advice: [],
    all: []
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [formCategory, setFormCategory] = useState<'symptom' | 'diagnosis' | 'lab_test' | 'advice'>('symptom');
  const [formTitle, setFormTitle] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/clinical-templates');
      setTemplates({
        symptoms: res.symptoms || [],
        diagnoses: res.diagnoses || [],
        lab_tests: res.lab_tests || [],
        advice: res.advice || [],
        all: res.all || []
      });
    } catch (err) {
      console.error('Error fetching clinical templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormCategory(activeTab);
    setFormTitle('');
    setFormDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TemplateItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormDetails(item.details || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this quick tag from your list?')) return;
    try {
      await apiClient.delete(`/clinical-templates/${id}`);
      fetchTemplates();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all quick tags to standard medical English defaults? Custom additions will be refreshed.')) return;
    try {
      await apiClient.post('/clinical-templates/reset-defaults', {});
      alert('✅ Clinical templates successfully restored to standard medical defaults.');
      fetchTemplates();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter a title for the template.');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await apiClient.put(`/clinical-templates/${editingItem.id}`, {
          category: formCategory,
          title: formTitle.trim(),
          details: formDetails.trim() || null
        });
      } else {
        await apiClient.post('/clinical-templates', {
          category: formCategory,
          title: formTitle.trim(),
          details: formDetails.trim() || null
        });
      }
      setIsModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter current active tab items
  const getCurrentItems = () => {
    let items: TemplateItem[] = [];
    if (activeTab === 'symptom') items = templates.symptoms;
    else if (activeTab === 'diagnosis') items = templates.diagnoses;
    else if (activeTab === 'lab_test') items = templates.lab_tests;
    else if (activeTab === 'advice') items = templates.advice;

    if (!searchQuery.trim()) return items;

    const lower = searchQuery.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        (item.details && item.details.toLowerCase().includes(lower))
    );
  };

  const currentItems = getCurrentItems();

  return (
    <div className="space-y-6">
      {/* EXECUTIVE HERO BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-brand-950 text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-400/30 flex items-center justify-center font-black text-xl shrink-0">
            <BookOpen className="h-6 w-6 text-brand-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black tracking-tight text-white">
                Clinical Preferences & EMR Templates
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 text-[10px] font-bold border border-brand-400/30">
                Doctor Customization
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium max-w-2xl leading-relaxed">
              Personalize your quick-access tags for Chief Complaints, Diagnoses, Lab Investigations, and Dietary Advice. All changes sync directly to your EMR consultation workspace.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Medical Defaults</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 text-xs font-black bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Tag</span>
          </Button>
        </div>
      </div>

      {/* CATEGORY TABS & SEARCH BAR */}
      <Card className="p-4 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          {/* Tab Navigation */}
          <div className="flex bg-slate-100 dark:bg-dark-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full lg:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => { setActiveTab('symptom'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'symptom'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Stethoscope className="h-4 w-4" />
              <span>Chief Complaints ({templates.symptoms.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('diagnosis'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'diagnosis'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Clinical Diagnoses ({templates.diagnoses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('lab_test'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'lab_test'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TestTube2 className="h-4 w-4" />
              <span>Lab Investigations ({templates.lab_tests.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('advice'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'advice'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Salad className="h-4 w-4" />
              <span>Dietary & Advice ({templates.advice.length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab.replace('_', ' ')} tags...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-dark-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
      </Card>

      {/* TEMPLATE ITEMS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-dark-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : currentItems.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-dark-950 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No matching {activeTab.replace('_', ' ')} tags found
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Add a new custom quick tag or reset to standard medical defaults.
          </p>
          <Button size="sm" onClick={handleOpenAdd} className="mt-2">
            + Add First {activeTab.replace('_', ' ')} Tag
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {currentItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-500/40 shadow-sm transition-all flex flex-col justify-between gap-3 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {item.title}
                  </h4>
                  <Badge type={
                    item.category === 'symptom' ? 'info' :
                    item.category === 'diagnosis' ? 'error' :
                    item.category === 'lab_test' ? 'warning' : 'success'
                  }>
                    {item.category.toUpperCase()}
                  </Badge>
                </div>
                {item.details && (
                  <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {item.details}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850 text-xs">
                <span className="text-[10px] text-slate-400 font-mono">
                  Tag #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-dark-950 rounded-lg transition-colors"
                    title="Edit tag"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-dark-950 rounded-lg transition-colors"
                    title="Delete tag"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Clinical Quick Tag' : 'Add New Clinical Quick Tag'}
      >
        <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Category *
            </label>
            <select
              value={formCategory}
              onChange={e => setFormCategory(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-xs font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="symptom">Chief Complaints & Symptoms</option>
              <option value="diagnosis">Clinical Diagnosis & Assessment</option>
              <option value="lab_test">Advised Lab Investigation</option>
              <option value="advice">Dietary Advice & Clinical Precaution</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Tag Title / Name *
            </label>
            <input
              type="text"
              required
              placeholder={
                formCategory === 'symptom' ? 'e.g. Chest Pain, High Grade Fever' :
                formCategory === 'diagnosis' ? 'e.g. Enteric Fever, Type 2 Diabetes' :
                formCategory === 'lab_test' ? 'e.g. Complete Blood Count (CBC), LFT' :
                'e.g. Drink warm fluids, avoid oily foods'
              }
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Optional Notes / Clinical Description
            </label>
            <textarea
              rows={3}
              placeholder="Provide any additional clinical guidance, dosage notes, or details (optional)..."
              value={formDetails}
              onChange={e => setFormDetails(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-dark-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 font-bold"
            >
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : '+ Add Quick Tag'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
