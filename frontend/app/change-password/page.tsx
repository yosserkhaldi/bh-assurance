'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';

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
    <main className="grid min-h-screen place-items-center bg-navy px-4">
      <section className="w-full max-w-md border-t-4 border-cyan bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center bg-cyan text-white">
            <LockKeyhole />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">Changement de mot de passe</h1>
            <p className="text-sm text-slate-500">Votre administrateur vous demande de choisir un nouveau mot de passe</p>
          </div>
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
          {error && <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="bg-green-50 p-3 text-sm text-green-700">{success}</p>}
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
      </section>
    </main>
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
        <input id={id} type={show ? 'text' : 'password'} className="field pr-10" {...register} />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="mt-1 text-xs text-red-600">{error}</p>
    </div>
  );
}
