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
    <div className="bg-white rounded-xl cl-shadow-sm border border-slate-200 cl-p-sm cl-mb-lg">
      <div className="flex flex-wrap cl-gap-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center cl-gap-md px-4 py-2.5 cl-rounded-md font-medium text-sm cl-transition-all
                ${isActive
                  ? 'cl-tab-active'
                  : 'cl-tab-inactive'
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
