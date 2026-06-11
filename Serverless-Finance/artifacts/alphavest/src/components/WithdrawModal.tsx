import { useState, FormEvent } from 'react';
import { X, Loader2, AlertCircle, Building2, Bitcoin, CheckCircle2, CreditCard } from 'lucide-react';

interface WithdrawModalProps {
  liquidity: number;
  onClose: () => void;
  onSuccess: (newLiquidity: number) => void;
}

type Method = 'bank' | 'crypto' | 'paystack';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export default function WithdrawModal({ liquidity, onClose, onSuccess }: WithdrawModalProps) {
  const [method, setMethod] = useState<Method>('bank');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('USDT-TRC20');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [newBalance, setNewBalance] = useState(0);

  const parseAmount = () => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? null : n;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseAmount();
    if (!amt) { setError('Enter a valid amount'); return; }
    if (amt > liquidity) { setError('Insufficient available balance'); return; }
    if (method === 'bank' && (!bankName || !bankAccountNumber || !bankAccountName)) {
      setError('Fill in all bank details'); return;
    }
    if (method === 'crypto' && !cryptoAddress) {
      setError('Enter your crypto wallet address'); return;
    }

    setLoading(true); setError('');
    try {
      const body: Record<string, unknown> = { amount: amt, method };
      if (method === 'bank') { body.bankName = bankName; body.bankAccountNumber = bankAccountNumber; body.bankAccountName = bankAccountName; }
      if (method === 'crypto') { body.cryptoAddress = cryptoAddress; body.cryptoNetwork = cryptoNetwork; }

      const r = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) { setError(data.message ?? 'Request failed'); setLoading(false); return; }
      setNewBalance(data.newLiquidity ?? liquidity - amt);
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const methods: { id: Method; label: string; icon: React.ReactNode }[] = [
    { id: 'bank', label: 'Bank Transfer', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'paystack', label: 'Paystack', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-brand-surface border border-brand-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="h-[2px] bg-red-500" />
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div>
            <h2 className="text-brand-text font-serif font-bold text-lg">Withdraw Funds</h2>
            <p className="text-brand-muted font-sans text-xs mt-0.5">Available: <span className="text-blue-400 font-bold">{fmt(liquidity)}</span></p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-brand-text font-serif font-bold text-lg mb-1">Request Submitted</p>
            <p className="text-brand-muted font-sans text-sm mb-3">Your withdrawal is being reviewed by our team. You'll be notified once it's processed.</p>
            <p className="text-xs font-sans text-brand-muted mb-5">New balance: <span className="text-blue-400 font-bold">{fmt(newBalance)}</span></p>
            <button onClick={() => onSuccess(newBalance)} className="bg-brand-gold text-black font-sans font-bold text-xs py-2.5 px-6 rounded uppercase tracking-widest hover:brightness-110 transition-all">Done</button>
          </div>
        ) : (
          <div className="p-5">
            {/* Method selector */}
            <div className="flex gap-1.5 mb-4">
              {methods.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m.id); setError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-sans font-medium transition-all flex-1 justify-center border ${
                    method === m.id
                      ? 'bg-red-600/20 border-red-500/40 text-red-300'
                      : 'border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-gold/30'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-300 font-sans text-xs">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Amount */}
              <div>
                <label className="block text-brand-muted font-sans text-xs mb-1">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-bold font-sans text-sm">$</span>
                  <input
                    type="number" min="1" max={liquidity} step="any" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg pl-7 pr-4 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-red-500/60"
                  />
                </div>
              </div>

              {/* Bank fields */}
              {method === 'bank' && (
                <>
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1">Bank Name</label>
                    <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Zenith Bank"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60" />
                  </div>
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1">Account Number</label>
                    <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="10-digit account number"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60" />
                  </div>
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1">Account Name</label>
                    <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Account holder name"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60" />
                  </div>
                </>
              )}

              {/* Paystack note */}
              {method === 'paystack' && (
                <div className="bg-brand-bg/60 border border-brand-border/60 rounded-lg p-3 text-xs font-sans text-brand-muted">
                  Paystack will process your withdrawal to your registered Nigerian bank account. Admin will initiate the transfer on your behalf.
                </div>
              )}

              {/* Crypto fields */}
              {method === 'crypto' && (
                <>
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1">Network</label>
                    <select value={cryptoNetwork} onChange={e => setCryptoNetwork(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-sans text-sm focus:outline-none focus:border-brand-gold/60">
                      {['BTC', 'USDT-TRC20', 'USDT-ERC20', 'ETH', 'SOL'].map(n => <option key={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-brand-muted font-sans text-xs mb-1">Your Wallet Address</label>
                    <input type="text" value={cryptoAddress} onChange={e => setCryptoAddress(e.target.value)} placeholder="Paste your wallet address"
                      className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-brand-text font-mono text-xs focus:outline-none focus:border-brand-gold/60" />
                  </div>
                </>
              )}

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2.5">
                <p className="text-yellow-400 font-sans text-xs">Withdrawals are subject to admin review (1–3 business days). Funds are deducted from your balance immediately pending approval.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white font-sans font-bold py-2.5 rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Processing…' : 'Submit Withdrawal'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
