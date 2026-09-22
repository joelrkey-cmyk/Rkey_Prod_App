import React from 'react';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { WEDDING_FORMULAS } from './weddingFormulas';

export const WeddingFormulasSelector = ({
  currentFormula,
  currentSeason,
  onSelectFormula,
  onChangeSeason,
  onClearFormula
}) => {
  const formulasList = ['essentielle', 'confort', 'signature', 'prestige'];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3.5 space-y-3">
      {/* Switch Haute / Basse saison */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          Formules Mariage
        </span>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => onChangeSeason('haute')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                currentSeason === 'haute'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Haute saison (Mai - Oct)
            </button>
            <button
              type="button"
              onClick={() => onChangeSeason('basse')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                currentSeason === 'basse'
                  ? 'bg-white text-blue-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Basse saison (Nov - Avr)
            </button>
          </div>

          {currentFormula && (
            <button
              type="button"
              onClick={onClearFormula}
              className="text-xs text-slate-500 hover:text-red-600 underline font-medium px-1.5 py-1"
            >
              Désélectionner
            </button>
          )}
        </div>
      </div>

      {/* Liste des 4 formules les unes en dessous des autres (style options existantes) */}
      <div className="grid grid-cols-1 gap-2.5">
        {formulasList.map((fKey) => {
          const formula = WEDDING_FORMULAS[fKey];
          const isSelected = currentFormula === fKey;
          const price = formula.prices[currentSeason] || formula.prices.haute;

          return (
            <div
              key={fKey}
              onClick={() => {
                if (isSelected) {
                  onClearFormula();
                } else {
                  onSelectFormula(fKey, currentSeason);
                }
              }}
              className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox checked={isSelected} readOnly />
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{formula.name}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant={isSelected ? "default" : "secondary"} className={isSelected ? "bg-blue-600" : ""}>
                        {price.toLocaleString('fr-FR')} €
                      </Badge>
                      <span className="text-[11px] text-slate-500">
                        {formula.unlimitedTime ? 'Sans limite' : `Fin ${formula.endTime}`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
