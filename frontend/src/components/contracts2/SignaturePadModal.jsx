// Modal de signature manuscrite du client
import React from 'react';
import { Button } from '../ui/button';

export const SignaturePadModal = ({ 
  showSignaturePad, 
  setShowSignaturePad, 
  signaturePadRef, 
  setSignaturePadRef, 
  setClientSignature,
  onSignatureValidated
}) => {
  if (!showSignaturePad) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="signature-pad-modal">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Signature manuscrite du client</h3>
        <p className="text-sm text-gray-600 mb-4">
          Dessinez votre signature dans l'espace ci-dessous :
        </p>
        
        <div className="border-2 border-gray-300 rounded-lg mb-4">
          <canvas
            ref={(canvas) => {
              if (canvas && !signaturePadRef) {
                setSignaturePadRef(canvas);
                const ctx = canvas.getContext('2d');
                canvas.width = 400;
                canvas.height = 150;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                let isDrawing = false;
                
                const startDrawing = (e) => {
                  isDrawing = true;
                  ctx.strokeStyle = '#000';
                  ctx.lineWidth = 2;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.moveTo(x, y);
                };
                
                const draw = (e) => {
                  if (!isDrawing) return;
                  const rect = canvas.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  ctx.lineTo(x, y);
                  ctx.stroke();
                };
                
                const stopDrawing = () => { isDrawing = false; };
                
                canvas.addEventListener('mousedown', startDrawing);
                canvas.addEventListener('mousemove', draw);
                canvas.addEventListener('mouseup', stopDrawing);
                canvas.addEventListener('mouseout', stopDrawing);
                
                canvas.addEventListener('touchstart', (e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
                });
                canvas.addEventListener('touchmove', (e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
                });
                canvas.addEventListener('touchend', (e) => {
                  e.preventDefault();
                  canvas.dispatchEvent(new MouseEvent('mouseup', {}));
                });
              }
            }}
            className="w-full h-32 cursor-crosshair"
            style={{ touchAction: 'none' }}
          />
        </div>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => {
              if (signaturePadRef) {
                const ctx = signaturePadRef.getContext('2d');
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, signaturePadRef.width, signaturePadRef.height);
              }
            }}
            className="flex-1"
            data-testid="signature-clear-btn"
          >
            Effacer
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowSignaturePad(false);
              setClientSignature(null);
            }}
            className="flex-1"
            data-testid="signature-cancel-btn"
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (signaturePadRef) {
                const signatureData = signaturePadRef.toDataURL('image/png');
                setClientSignature(signatureData);
                onSignatureValidated(signatureData);
              }
            }}
            className="flex-1 bg-green-600 hover:bg-green-700"
            data-testid="signature-validate-btn"
          >
            Valider et télécharger
          </Button>
        </div>
      </div>
    </div>
  );
};
