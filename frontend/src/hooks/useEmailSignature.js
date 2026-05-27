import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_API_URL || '';

export function useEmailSignature() {
  const [signatureHtml, setSignatureHtml] = useState('<br/><br/><p>Cordialement,<br/><b>L’équipe R’KEY PROD</b></p>');

  useEffect(() => {
    async function fetchSignature() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/global-settings/email-signature`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.signatureHtml) {
            setSignatureHtml(data.signatureHtml);
          } else if (data && data.imageUrl) {
            setSignatureHtml(`<br/><br/><img src="${data.imageUrl}" alt="Email Signature" style="max-width: 300px; height: auto;" />`);
          }
        }
      } catch (e) {
        console.warn('Failed to load email signature:', e);
      }
    }
    fetchSignature();
  }, []);

  return { signatureHtml };
}
