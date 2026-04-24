import React from 'react';

const EmptyState = ({ icon, title, description, action }) => (
  <div className="rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-8 text-center">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
      {icon}
    </div>
    <p className="font-medium text-slate-700 mb-1">{title}</p>
    {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}
    {action}
  </div>
);

export default EmptyState;
