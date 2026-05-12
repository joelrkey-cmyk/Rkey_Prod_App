import React, { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Braces, Copy } from 'lucide-react';
import { toast } from 'sonner';

const VARIABLES = [
  { key: '{nom}', label: 'Nom', desc: 'Nom du contact' },
  { key: '{email}', label: 'Email', desc: 'Adresse email' },
  { key: '{telephone}', label: 'Téléphone', desc: 'Numéro de téléphone' },
  { key: '{entreprise}', label: 'Entreprise', desc: 'Nom de l\'entreprise' },
  { key: '{date_evenement}', label: 'Date événement', desc: 'Date de l\'événement' },
  { key: '{type_evenement}', label: 'Type événement', desc: 'Type d\'événement' },
  { key: '{nombre_personnes}', label: 'Nb personnes', desc: 'Nombre de personnes' },
  { key: '{message}', label: 'Message', desc: 'Message du visiteur' },
];

const VariableInsertMenu = ({ onInsert, submissionData }) => {
  const [open, setOpen] = useState(false);

  const handleInsert = (variable) => {
    onInsert(variable.key);
    setOpen(false);
    toast.success(`Variable ${variable.key} insérée`);
  };

  const getPreview = (key) => {
    if (!submissionData) return '';
    const field = key.replace(/[{}]/g, '');
    return submissionData[field] || '';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          data-testid="variable-insert-btn"
        >
          <Braces className="w-3.5 h-3.5" />
          Variables
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase tracking-wider">Insérer une variable</p>
        <div className="space-y-0.5 mt-1">
          {VARIABLES.map((v) => {
            const preview = getPreview(v.key);
            return (
              <button
                key={v.key}
                onClick={() => handleInsert(v)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-orange-50 transition-colors text-left group"
                data-testid={`var-${v.key.replace(/[{}]/g, '')}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-orange-600 bg-orange-50 px-1 py-0.5 rounded">{v.key}</code>
                    <span className="text-xs text-gray-500">{v.label}</span>
                  </div>
                  {preview && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{preview}</p>
                  )}
                </div>
                <Copy className="w-3 h-3 text-gray-300 group-hover:text-orange-500 flex-shrink-0" />
              </button>
            );
          })}
        </div>
        {submissionData && (
          <p className="text-[10px] text-gray-400 px-2 pt-2 border-t mt-2">
            Les valeurs seront remplacées automatiquement lors de l'envoi
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { VARIABLES };
export default VariableInsertMenu;
