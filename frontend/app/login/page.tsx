'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth-layout';

const schema = z.object({ email: z.email('Email invalide'), password: z.string().min(8, '8 caracteres minimum') });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { email: 'admin@bh-assurance.tn', password: 'Admin123!' },
  });
  const submit = async (values: FormData) => {
    setError('');
    try {
      const { data } = await api.post('/auth/login', values);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.replace(data.user.requiresPasswordChange ? '/change-password' : '/dashboard');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? 'Connexion impossible');
    }
  };
  return (
    <AuthLayout>
        <div className="mb-9">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brandRed">Portail interne</p>
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-navy sm:text-5xl">Accédez à votre espace de travail</h1>
          <div className="mt-5 h-1 w-12 rounded-full bg-brandRed" />
          <p className="mt-5 text-base leading-7 text-slate-600">Retrouvez vos dossiers, contrats et outils de gestion.</p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-5" noValidate>
          <div><label className="label" htmlFor="email">E-mail professionnel</label><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/><input id="email" type="email" autoComplete="email" className="field pl-12" {...register('email')} /></div><p className="mt-1.5 min-h-4 text-xs text-red-600">{errors.email?.message}</p></div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/>
              <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" className="field pl-12 pr-12" {...register('password')} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded text-slate-500 hover:text-navy"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1.5 min-h-4 text-xs text-red-600">{errors.password?.message}</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary !h-12 w-full" disabled={isSubmitting}>{isSubmitting ? 'Connexion...' : 'Se connecter'}</button>
          <div className="flex items-center justify-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500"><ShieldCheck size={17} className="text-navy"/> Accès sécurisé · Réservé aux collaborateurs BH Assurance</div>
        </form>
    </AuthLayout>
  );
}
