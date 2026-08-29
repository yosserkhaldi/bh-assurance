'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/lib/api';

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
    <main className="grid min-h-screen place-items-center bg-navy px-4">
      <section className="w-full max-w-md border-t-4 border-cyan bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center bg-cyan text-white"><LockKeyhole /></div>
          <div><h1 className="text-xl font-bold text-navy">BH Assurance</h1><p className="text-sm text-slate-500">Gestion du parc assure</p></div>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-5">
          <div><label className="label" htmlFor="email">Adresse email</label><input id="email" className="field" {...register('email')} /><p className="mt-1 text-xs text-red-600">{errors.email?.message}</p></div>
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} className="field pr-10" {...register('password')} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-red-600">{errors.password?.message}</p>
          </div>
          {error && <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Connexion...' : 'Se connecter'}</button>
        </form>
      </section>
    </main>
  );
}
