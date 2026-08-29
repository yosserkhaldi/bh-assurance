'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth-layout';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(8, '8 caracteres minimum')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
        message: 'Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un caractere special',
      }),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const submit = async (values: FormData) => {
    setError('');
    setSuccess('');
    try {
      await api.patch('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setSuccess('Mot de passe modifie avec succes. Redirection...');
      setTimeout(() => router.replace('/dashboard'), 1500);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Impossible de modifier le mot de passe');
    }
  };

  return (
    <AuthLayout>
        <div className="mb-8">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-navy"><KeyRound size={23}/></div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brandRed">Sécurité du compte</p>
          <h1 className="text-4xl font-bold tracking-tight text-navy">Créez votre nouveau mot de passe</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Votre administrateur vous demande de sécuriser votre compte avant d’accéder à l’espace de travail.</p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <PasswordField
            id="currentPassword"
            label="Mot de passe actuel"
            show={showCurrent}
            toggle={() => setShowCurrent((v) => !v)}
            error={errors.currentPassword?.message}
            register={register('currentPassword')}
          />
          <PasswordField
            id="newPassword"
            label="Nouveau mot de passe"
            show={showNew}
            toggle={() => setShowNew((v) => !v)}
            error={errors.newPassword?.message}
            register={register('newPassword')}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirmer le nouveau mot de passe"
            show={showConfirm}
            toggle={() => setShowConfirm((v) => !v)}
            error={errors.confirmPassword?.message}
            register={register('confirmPassword')}
          />
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={18}/>{success}</p>}
          <button className="btn-primary !h-12 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
    </AuthLayout>
  );
}

function PasswordField({
  id,
  label,
  show,
  toggle,
  error,
  register,
}: {
  id: string;
  label: string;
  show: boolean;
  toggle: () => void;
  error?: string;
  register: ReturnType<UseFormRegister<FormData>>;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
        <input id={id} type={show ? 'text' : 'password'} autoComplete={id === 'currentPassword' ? 'current-password' : 'new-password'} className="field pl-12 pr-12" {...register} />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-slate-500 hover:text-navy"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="mt-1.5 min-h-4 text-xs text-red-600">{error}</p>
    </div>
  );
}
