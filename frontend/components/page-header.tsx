export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5"><div><div className="mb-3 h-1 w-9 rounded-full bg-brandRed"/><h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1><p className="mt-1.5 text-sm text-slate-500">{description}</p></div>{action}</div>;
}
