'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/modal';
import { api } from '@/lib/api';
import type { Contract, EstablishmentForContract } from '@/types';

interface RenewalForm {
  number: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
  establishmentId: string;
  copyVehicles: boolean;
}

interface RenewalModalProps {
  contract: Contract | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  establishments?: EstablishmentForContract[];
}

const empty: RenewalForm = {
  number: '',
  type: 'FLEET',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  establishmentId: '',
  copyVehicles: true,
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function RenewalModal({ contract, open, onClose, onSuccess, establishments }: RenewalModalProps) {
  const [form, setForm] = useState<RenewalForm>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contract) {
      setForm(empty);
      return;
    }
    const start = addDays(contract.endDate, 1);
    const previousStart = new Date(contract.startDate);
    const previousEnd = new Date(contract.endDate);
    const durationMs = previousEnd.getTime() - previousStart.getTime();
    const end = new Date(new Date(start).getTime() + durationMs).toISOString().slice(0, 10);
    const baseNumber = contract.number.replace(/-R\d+$/i, '');
    setForm({
      number: `${baseNumber}-R1`,
      type: contract.type,
      startDate: start,
      endDate: end,
      status: 'ACTIVE',
      establishmentId: contract.establishmentId,
      copyVehicles: true,
    });
  }, [contract]);

  const establishmentName = useMemo(() => {
    return establishments?.find((e) => e.id === contract?.establishmentId)?.businessName ?? contract?.establishment.businessName ?? '';
  }, [contract, establishments]);

  const set = (key: keyof RenewalForm, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    setLoading(true);
    try {
      await api.post(`/contracts/${contract.id}/renew`, form);
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={contract ? `Renouveler ${contract.number}` : 'Renouvellement'} open={open} onClose={onClose}>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Etablissement</span>
          <input className="field" value={establishmentName} disabled />
        </label>
        <label>
          <span className="label">Numero du nouveau contrat</span>
          <input
            required
            minLength={3}
            maxLength={100}
            pattern="[A-Za-z0-9][A-Za-z0-9/_-]{2,99}"
            className="field"
            value={form.number}
            onChange={(e) => set('number', e.target.value)}
          />
        </label>
        <label>
          <span className="label">Type</span>
          <select className="field" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {['FLEET', 'INDIVIDUAL', 'TEMPORARY', 'OTHER'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Date de debut</span>
          <input
            required
            type="date"
            className="field"
            max={form.endDate || undefined}
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </label>
        <label>
          <span className="label">Date de fin</span>
          <input
            required
            type="date"
            className="field"
            min={form.startDate || undefined}
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </label>
        <label className="sm:col-span-2 flex items-center gap-2 rounded border p-3">
          <input
            type="checkbox"
            checked={form.copyVehicles}
            onChange={(e) => set('copyVehicles', e.target.checked)}
          />
          <span className="text-sm font-medium text-slate-700">Conserver / transferer les vehicules du contrat precedent</span>
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button className="btn-primary" disabled={loading}>
            {loading ? 'Renouvellement...' : 'Renouveler'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
