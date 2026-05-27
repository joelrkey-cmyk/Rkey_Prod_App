import { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import API_BASE_URL from '../utils/apiUrl';

const API = `${API_BASE_URL}/api`;

export function useEmailSignature() {
  const [signatureHtml, setSignatureHtml] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignature() {
      try {
        const res = await axios.get(`${API}/global-settings/email-signature`);
        if (res.data && res.data.email_signature_image) {
          const imgBase = res.data.email_signature_image;
          // Standardize base64 data URIs
          const src = imgBase.startsWith('data:') ? imgBase : `data:image/png;base64,${imgBase}`;
          setSignatureHtml(`<br/><br/><img src="${src}" style="max-height:120px;display:block;" alt="Signature" />`);
        } else {
          setSignatureHtml('<br/><br/><p>Cordialement,<br/><strong>L\'équipe R\'KEY PROD</strong></p>');
        }
      } catch (err) {
        console.error('Error loading email signature hook:', err);
        setSignatureHtml('<br/><br/><p>Cordialement,<br/><strong>L\'équipe R\'KEY PROD</strong></p>');
      } finally {
        setLoading(false);
      }
    }

    fetchSignature();
  }, []);

  return { signatureHtml, loading };
}
