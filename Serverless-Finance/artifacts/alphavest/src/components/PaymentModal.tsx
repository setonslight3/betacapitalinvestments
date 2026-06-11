import { useState, useEffect, FormEvent } from 'react';
import { X, Loader2, Copy, CheckCircle2, ExternalLink, Bitcoin, CreditCard, Building2, AlertCircle } from 'lucide-react';

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

type Tab = 'paystack' | 'flutterwave' | 'monnify' | 'crypto';
type CryptoNetwork = 'BTC' | 'USDT-TRC20' | 'USDT-ERC20' | 'ETH' | 'SOL';

const NETWORK_MAP: Record<CryptoNetwork, keyof CryptoAddresses> = {
  'BTC': 'btc',
  'USDT-TRC20': 'usdtTrc20',
  'USDT-ERC20': 'usdtErc20',
  'ETH': 'eth',
  'SOL': 'sol',
};

export default function PaymentModal({ onClose, onSuccess }: PaymentModalProps) {
  const [tab, setTab] = useState<Tab>('paystack');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cryptoAddresses, setCryptoAddresses] = useState<CryptoAddresses>({ btc: null, usdtTrc20: null, usdtErc20: null, eth: null, sol: null });
  const [cryptoNetwork, setCryptoNetwork] = useState<CryptoNetwork>('USDT-TRC20');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState('');
  const [cryptoSubmitted, setCryptoSubmitted] = useState(false);

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

  const initGateway = async (provider: string) => {
    const amt = parseAmount();
    if (!amt) { setError('Enter a valid amount'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch(`/api/payments/${provider}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Failed to initialize'); setLoading(false); return; }
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank');
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount();
    if (!amt) { setError('Enter a valid amount'); return; }
    if (!txHash.trim()) { setError('Paste your transaction hash'); return; }
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/payments/crypto/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, network: cryptoNetwork, txHash: txHash.trim() }),
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'paystack', label: 'Paystack', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'flutterwave', label: 'Flutterwave', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'monnify', label: 'Monnify', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-3.5 h-3.5" /> },
  ];

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
            <p className="text-brand-muted font-sans text-xs mt-0.5">Choose a deposit method below</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-brand-border bg-brand-bg/40">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-sans font-medium transition-all flex-1 justify-center ${
                tab === t.id
                  ? 'bg-brand-gold text-black'
                  : 'text-brand-muted hover:text-brand-text hover:bg-brand-border/30'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 font-sans text-xs">{error}</p>
            </div>
          )}

          {/* Paystack / Flutterwave / Monnify tabs */}
          {(tab === 'paystack' || tab === 'flutterwave' || tab === 'monnify') && (
            <form onSubmit={(e) => { e.preventDefault(); initGateway(tab); }} className="space-y-4">
              <div className="bg-brand-bg/60 border border-brand-border/60 rounded-lg p-3 text-xs font-sans text-brand-muted leading-relaxed">
                {tab === 'paystack' && '✓ Card, bank transfer, USSD via Paystack — USD & NGN accepted'}
                {tab === 'flutterwave' && '✓ Card, bank transfer, mobile money via Flutterwave — global currencies'}
                {tab === 'monnify' && '✓ Bank transfer and card via Monnify — NGN bank accounts'}
              </div>
              <div>
                <label className="block text-brand-muted font-sans text-xs mb-1.5">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold font-bold font-sans text-sm">$</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg pl-7 pr-4 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gold text-black font-sans font-bold py-2.5 rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {loading ? 'Redirecting…' : `Pay with ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
              </button>
            </form>
          )}

          {/* Crypto tab */}
          {tab === 'crypto' && (
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
                  {/* Network selector */}
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

                  {/* Wallet address */}
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

                  {/* Amount */}
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

                  {/* TX Hash */}
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1.5">Transaction Hash (after sending)</label>
                    <input
                      type="text" value={txHash} onChange={e => setTxHash(e.target.value)}
                      placeholder="Paste your tx hash here"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-mono text-[11px] focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !currentAddress}
                    className="w-full bg-brand-gold text-black font-sans font-bold py-2.5 rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {loading ? 'Submitting…' : 'Submit for Review'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
