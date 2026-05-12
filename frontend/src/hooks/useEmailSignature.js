import { useState, useEffect } from 'react';
import apiService from '../services/api';

// Hook partagé pour charger la signature email depuis les Paramètres Généraux
// La signature est réduite de 40% (max-width: 168px au lieu de 280px)
const SIGNATURE_MAX_WIDTH = '168px';

export function useEmailSignature() {
  const [signatureHtml, setSignatureHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignature = async () => {
      try {
        const res = await apiService.get('/global-settings/email-signature');
        const sigImage = res.data?.email_signature_image;
        if (sigImage) {
          setSignatureHtml(`<p><br></p><p><img src="${sigImage}" style="max-width: ${SIGNATURE_MAX_WIDTH};"></p>`);
        }
      } catch (e) {
        console.error('Failed to load email signature:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSignature();
  }, []);

  return { signatureHtml, loading };
}

export default useEmailSignature;
