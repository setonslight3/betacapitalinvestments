import { useState, useEffect, FormEvent } from 'react';
import { X, Loader2, Copy, CheckCircle2, Bitcoin, AlertCircle, Upload, FileText, Image as ImageIcon } from 'lucide-react';

interface CryptoAddresses {
  btc: string | null;
  usdtTrc20: string | null;
  usdtErc20: string | null;
  eth: string | null;
  sol: string | null;
}

interface PaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type CryptoNetwork = 'BTC' | 'USDT-TRC20' | 'USDT-ERC20' | 'ETH' | 'SOL';

const NETWORK_MAP: Record<CryptoNetwork, keyof CryptoAddresses> = {
  'BTC': 'btc',
  'USDT-TRC20': 'usdtTrc20',
  'USDT-ERC20': 'usdtErc20',
  'ETH': 'eth',
  'SOL': 'sol',
};

export default function PaymentModal({ onClose }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cryptoAddresses, setCryptoAddresses] = useState<CryptoAddresses>({ btc: null, usdtTrc20: null, usdtErc20: null, eth: null, sol: null });
  const [cryptoNetwork, setCryptoNetwork] = useState<CryptoNetwork>('USDT-TRC20');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [copied, setCopied] = useState('');
  const [cryptoSubmitted, setCryptoSubmitted] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/crypto/addresses', { credentials: 'include' })
      .then(r => r.json()).then(setCryptoAddresses).catch(() => {});
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const parseAmount = () => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? null : n;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCryptoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount();
    if (!amt) { setError('Enter a valid amount'); return; }
    if (!receiptImage) { setError('Please upload a receipt or screenshot of the transaction'); return; }
    setLoading(true); setError('');
    try {
      // In a real app, you'd upload the file first
      const formData = new FormData();
      formData.append('amount', amt.toString());
      formData.append('network', cryptoNetwork);
      formData.append('receipt', receiptImage);

      const r = await fetch('/api/payments/crypto/submit', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Submission failed'); setLoading(false); return; }
      setCryptoSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentAddress = cryptoAddresses[NETWORK_MAP[cryptoNetwork]];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div>
            <h2 className="text-brand-text font-serif font-bold text-lg">Fund Account</h2>
            <p className="text-brand-muted font-sans text-xs mt-0.5">Deposit via cryptocurrency</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 font-sans text-xs">{error}</p>
            </div>
          )}

          {/* Crypto tab */}
          <div className="space-y-4">
            {cryptoSubmitted ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-brand-text font-serif font-bold text-lg">Submission Received</p>
                <p className="text-brand-muted font-sans text-sm mt-1">Your deposit is under review. Funds will be credited within 1–3 hours after blockchain confirmation.</p>
                <button onClick={onClose} className="mt-4 text-brand-gold font-sans text-sm hover:underline">Close</button>
              </div>
            ) : (
              <form onSubmit={handleCryptoSubmit} className="space-y-4">
                <div>
                  <label className="block text-brand-muted font-sans text-xs mb-1.5">Select Network</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['BTC', 'USDT-TRC20', 'USDT-ERC20', 'ETH', 'SOL'] as CryptoNetwork[]).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCryptoNetwork(n)}
                        className={`px-2 py-1.5 rounded text-[10px] font-sans font-bold border transition-all ${
                          cryptoNetwork === n
                            ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                            : 'border-brand-border text-brand-muted hover:border-brand-gold/40'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-brand-muted font-sans text-xs mb-1.5">Amount in USD equivalent</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold font-bold font-sans text-sm">$</span>
                    <input
                      type="number" min="1" step="any" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="Enter USD value"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg pl-7 pr-4 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                </div>

                {currentAddress ? (
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1.5">Send {cryptoNetwork} to this address</label>
                    <div className="bg-brand-bg border border-brand-border rounded-lg p-3 flex items-center gap-2">
                      <span className="text-brand-text font-mono text-[11px] flex-1 break-all leading-relaxed">{currentAddress}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentAddress, 'addr')}
                        className="shrink-0 text-brand-muted hover:text-brand-gold transition-colors"
                      >
                        {copied === 'addr' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 font-sans text-xs">Wallet address for {cryptoNetwork} not yet configured. Contact support.</p>
                  </div>
                )}

                <div>
                  <label className="block text-brand-muted font-sans text-xs mb-1.5">Upload Transaction Receipt</label>
                  <div className="relative border-2 border-dashed border-brand-border bg-brand-bg rounded-lg p-4 hover:border-brand-gold/40 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {receiptImage && imagePreview ? (
                      <div className="text-center">
                        {receiptImage.type.startsWith('image/') ? (
                          <img src={imagePreview} alt="Receipt preview" className="max-h-32 mx-auto mb-2 rounded" />
                        ) : (
                          <FileText className="w-10 h-10 text-brand-gold mx-auto mb-2" />
                        )}
                        <p className="text-sm text-brand-text font-medium">{receiptImage.name}</p>
                        <p className="text-xs text-brand-muted font-sans mt-1">{(receiptImage.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="text-center">
                      <Upload className="w-8 h-8 text-brand-gold mx-auto mb-2" />
                      <p className="text-sm text-brand-text font-medium">Upload receipt or screenshot</p>
                      <p className="text-xs text-brand-muted font-sans mt-1">Click or drag file here</p>
                    </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !currentAddress}
                  className="w-full bg-brand-gold text-black font-sans font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loading ? 'Submitting…' : 'Submit for Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
