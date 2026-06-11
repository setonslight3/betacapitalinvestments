import { useState, FormEvent, useRef } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Upload, FileText, Clock, ShieldCheck } from 'lucide-react';

interface KycModalProps {
  onClose: () => void;
}

const DOC_TYPES = [
  { id: 'passport', label: 'International Passport' },
  { id: 'national_id', label: 'National ID Card' },
  { id: 'drivers_license', label: "Driver's License" },
  { id: 'utility_bill', label: 'Utility Bill (recent, 3 months)' },
];

export default function KycModal({ onClose }: KycModalProps) {
  const [docType, setDocType] = useState('passport');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return; }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(f.type)) { setError('Only JPEG, PNG, WebP, or PDF files are accepted'); return; }
    setFile(f);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file to upload'); return; }

    setLoading(true); setError('');
    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const r = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          fileDataBase64: base64,
          fileName: file.name,
          mimeType: file.type,
        }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Submission failed'); setLoading(false); return; }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-[2px] bg-brand-gold" />
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-gold" />
            <div>
              <h2 className="text-brand-text font-serif font-bold text-base">Identity Verification</h2>
              <p className="text-brand-muted font-sans text-xs mt-0.5">KYC Document Upload</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text p-1"><X className="w-5 h-5" /></button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <Clock className="w-12 h-12 text-brand-gold mx-auto mb-3" />
            <p className="text-brand-text font-serif font-bold text-lg mb-1">Document Submitted</p>
            <p className="text-brand-muted font-sans text-sm mb-5">Your identity document is under review. This typically takes 1–2 business days. You'll be notified once reviewed.</p>
            <button onClick={onClose} className="bg-brand-gold text-black font-sans font-bold text-xs py-2.5 px-6 rounded uppercase tracking-widest hover:brightness-110 transition-all">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 font-sans text-xs">{error}</p>
              </div>
            )}

            <div className="bg-brand-bg/60 border border-brand-border/60 rounded-lg p-3 text-xs font-sans text-brand-muted">
              Upload a clear, readable copy of your government-issued ID. Ensure all text is clearly visible. Max 5MB.
            </div>

            {/* Document Type */}
            <div>
              <label className="block text-brand-muted font-sans text-xs mb-1.5">Document Type</label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map(dt => (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDocType(dt.id)}
                    className={`text-left px-3 py-2 rounded border text-[11px] font-sans transition-all ${
                      docType === dt.id
                        ? 'border-brand-gold bg-brand-gold/10 text-brand-gold font-bold'
                        : 'border-brand-border text-brand-muted hover:border-brand-gold/40'
                    }`}
                  >
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-brand-muted font-sans text-xs mb-1.5">Upload Document</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border hover:border-brand-gold/40 rounded-lg p-6 text-center cursor-pointer transition-colors"
              >
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-brand-gold" />
                    <span className="text-sm font-sans text-brand-text truncate max-w-48">{file.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-brand-muted mx-auto mb-2" />
                    <p className="text-xs font-sans text-brand-muted">Click to select file</p>
                    <p className="text-[10px] font-sans text-brand-muted/60 mt-0.5">JPEG, PNG, WebP, PDF · Max 5MB</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-brand-gold text-black font-sans font-bold py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Uploading…' : 'Submit Document'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
