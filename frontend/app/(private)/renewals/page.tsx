'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/data-table';

const ContractDataTable = DataTable<Contract>;
import { PageHeader } from '@/components/page-header';
import { RenewalModal } from '@/components/renewal-modal';
import { useCan } from '@/hooks/use-can';
import { api } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import type { Contract, EstablishmentForContract } from '@/types';

const filters = [
  { label: '30 jours', value: 30 },
  { label: '60 jours', value: 60 },
  { label: '90 jours', value: 90 },
];

export default function RenewalsPage() {
  const { can } = useCan();
  const canRenew = can(Permission.CONTRACTS_RENEW);

  const [days, setDays] = useState(30);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [establishments, setEstablishments] = useState<EstablishmentForContract[]>([]);
  const [renewing, setRenewing] = useState<Contract | null>(null);
  const [renewalOpen, setRenewalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Contract[]>(`/contracts/to-renew?days=${days}`);
      setContracts(r.data);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void api.get<EstablishmentForContract[]>('/establishments/for-contract').then((r) => setEstablishments(r.data));
  }, []);

  const beginRenew = (contract: Contract) => {
    setRenewing(contract);
    setRenewalOpen(true);
  };

  const columns = useMemo<ColumnDef<Contract>[]>(() => [
    { accessorKey: 'number', header: 'Numero', cell: ({ row }) => <span className="font-semibold text-navy">{row.original.number}</span> },
    { id: 'establishment', header: 'Etablissement', cell: ({ row }) => row.original.establishment.businessName },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'endDate', header: 'Echeance', cell: ({ row }) => new Date(row.original.endDate).toLocaleDateString('fr-TN') },
    { id: 'vehicles', header: 'Vehicules', cell: ({ row }) => row.original._count?.vehicles ?? 0 },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        {canRenew && (
          <button title="Renouveler" className="btn-secondary !h-9 !px-2 text-emerald-700" onClick={() => beginRenew(row.original)}>
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    ) },
  ], [canRenew]);

  return (
    <>
      <PageHeader title="Renouvellements" description="Contrats a renouveler prochainement" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">Echeance dans :</span>
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setDays(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${days === f.value ? 'bg-cyan text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading && <p className="py-10 text-center text-sm text-slate-500">Chargement...</p>}
      {!loading && <ContractDataTable data={contracts} columns={columns} pageCount={1} page={1} onPage={() => {}} search={search} onSearch={setSearch} />}
      <RenewalModal
        contract={renewing}
        open={renewalOpen}
        onClose={() => setRenewalOpen(false)}
        onSuccess={() => { void load(); }}
        establishments={establishments}
      />
    </>
  );
}
