import { apiClient } from '../services/api';

export interface ClinicSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicMobile: string;
  receiptFooter: string;
}

export const DEFAULT_CLINIC_SETTINGS: ClinicSettings = {
  clinicName: 'DR. TALHA CLINIC',
  clinicAddress: '12-B, Main Boulevard, Gulberg III, Lahore',
  clinicPhone: '(042) 35889900',
  clinicMobile: '0311-6353044',
  receiptFooter: 'THANK YOU FOR VISITING DR. TALHA CLINIC\nPLEASE RETAIN THIS RECEIPT SLIP FOR YOUR RECORD'
};

const STORAGE_KEY = 'hms_clinic_settings';

export const getCachedClinicSettings = (): ClinicSettings => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_CLINIC_SETTINGS, ...JSON.parse(cached) };
    }
  } catch (e) {}
  return DEFAULT_CLINIC_SETTINGS;
};

export const fetchClinicSettings = async (): Promise<ClinicSettings> => {
  try {
    const res = await apiClient.get('/settings/clinic');
    if (res && res.clinicName) {
      const data: ClinicSettings = {
        clinicName: res.clinicName || DEFAULT_CLINIC_SETTINGS.clinicName,
        clinicAddress: res.clinicAddress || DEFAULT_CLINIC_SETTINGS.clinicAddress,
        clinicPhone: res.clinicPhone || DEFAULT_CLINIC_SETTINGS.clinicPhone,
        clinicMobile: res.clinicMobile || DEFAULT_CLINIC_SETTINGS.clinicMobile,
        receiptFooter: res.receiptFooter || DEFAULT_CLINIC_SETTINGS.receiptFooter,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('[ClinicSettings Fetch Notice]:', err);
  }
  return getCachedClinicSettings();
};
