import React from 'react';
import { ImageIcon, Printer, LayoutDashboard, Palette, TrendingUp, Clock } from 'lucide-react';

type AdminTab = 'gallery' | 'materials' | 'shapes' | 'delivery' | 'costs';

interface AdminTabsProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'gallery', label: 'Galería', icon: ImageIcon },
  { id: 'materials', label: 'Materiales', icon: Printer },
  { id: 'shapes', label: 'Formas y Tamaños', icon: LayoutDashboard },
  { id: 'delivery', label: 'Formato y Diseño', icon: Palette },
  { id: 'costs', label: 'Costos y Tiempos', icon: TrendingUp },
];

export const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
