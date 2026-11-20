import { lazy, Suspense, useEffect } from 'react';
import { Boxes, Calculator, FolderKanban, Languages, LayoutDashboard, Shapes } from 'lucide-react';
import { useStore, type View } from './store/useStore';
import { useT } from './ui/common';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import CostEstimator from './pages/CostEstimator';
import Projects from './pages/Projects';
import Quotation from './pages/Quotation';

// three.js is heavy: load the configurator only when it is opened
const Configurator = lazy(() => import('./pages/Configurator'));

const NAV: { view: View; ar: string; en: string; Icon: typeof Boxes }[] = [
  { view: 'dashboard', ar: 'الرئيسية', en: 'Dashboard', Icon: LayoutDashboard },
  { view: 'library', ar: 'المنتجات', en: 'Products', Icon: Shapes },
  { view: 'configurator', ar: 'المصمم 3D', en: '3D Studio', Icon: Boxes },
  { view: 'cost', ar: 'التكلفة', en: 'Costing', Icon: Calculator },
  { view: 'projects', ar: 'المشاريع', en: 'Projects', Icon: FolderKanban },
];

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-xl bg-forest text-lg font-bold text-white">W</div>
      <div className="leading-tight">
        <div className="font-bold text-forest-dark">Wonder</div>
        <div className="text-[11px] text-muted">Design Studio</div>
      </div>
    </div>
  );
}

export default function App() {
  const t = useT();
  const { lang, view, setLang, setView, loadProjects, storageError } = useStore();

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const LangButton = (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm hover:bg-sand"
      aria-label="Switch language"
    >
      <Languages className="size-4" />
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* desktop / tablet side navigation */}
      <aside className="no-print hidden w-56 shrink-0 flex-col border-e border-line bg-white p-4 md:flex">
        <Logo />
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV.map(({ view: v, ar, en, Icon }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-start text-sm font-medium transition ${
                view === v ? 'bg-forest text-white' : 'text-ink hover:bg-sand'
              }`}
            >
              <Icon className="size-5" />
              {t(ar, en)}
            </button>
          ))}
        </nav>
        {LangButton}
      </aside>

      {/* mobile top bar */}
      <header className="no-print flex items-center justify-between border-b border-line bg-white px-4 py-2 md:hidden">
        <Logo />
        {LangButton}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {storageError && (
          <div className="no-print m-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {t('تعذر الحفظ في المتصفح: ', 'Could not save to browser storage: ')}
            {storageError}
          </div>
        )}
        {view === 'dashboard' && <Dashboard />}
        {view === 'library' && <Library />}
        {view === 'configurator' && (
          <Suspense fallback={<div className="p-8 text-center text-muted">{t('جارٍ تحميل المصمم…', 'Loading studio…')}</div>}>
            <Configurator />
          </Suspense>
        )}
        {view === 'cost' && <CostEstimator />}
        {view === 'projects' && <Projects />}
        {view === 'quote' && <Quotation />}
      </main>

      {/* mobile bottom tab bar */}
      <nav
        className="no-print grid grid-cols-5 border-t border-line bg-white md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV.map(({ view: v, ar, en, Icon }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              view === v ? 'text-forest' : 'text-muted'
            }`}
          >
            <Icon className="size-5" />
            {t(ar, en)}
          </button>
        ))}
      </nav>
    </div>
  );
}
