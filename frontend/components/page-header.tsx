export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold text-navy">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div>;
}
