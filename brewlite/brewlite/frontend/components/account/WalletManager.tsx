'use client';

// TÀI KHOẢN ẢO LIÊN KẾT: liên kết ví điện tử / thẻ, xem số dư, nạp tiền, xem lịch sử số dư, huỷ liên kết.
// Số dư lưu ở backend; thanh toán đơn bằng ví/thẻ sẽ trừ thẳng vào số dư của tài khoản ảo tương ứng.
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/lib/api';
import { PAYMENT_METHODS, WALLET_PROVIDERS } from '@/lib/mock-data';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { Wallet, WalletProvider } from '@/lib/types';
import { TOPUP_MAX, TOPUP_MIN, TOPUP_PRESETS, accountNumberHint, useWalletActions, useWallets } from '@/lib/wallets';
import Skeleton from '@/components/ui/Skeleton';
import { PlusIcon } from '@/components/ui/Icons';

const methodOf = (id: WalletProvider) => PAYMENT_METHODS.find((m) => m.id === id)!;
const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

function Badge({ provider }: { provider: WalletProvider }) {
  const m = methodOf(provider);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-white" style={{ backgroundColor: m.badgeColor }} aria-hidden="true">
      {m.badge}
    </span>
  );
}

/** Một tài khoản ảo đã liên kết: số dư, nạp tiền, lịch sử, huỷ liên kết */
function WalletCard({ wallet, onMessage }: { wallet: Wallet; onMessage: (text: string) => void }) {
  const { topup, unlink } = useWalletActions();
  const [topupOpen, setTopupOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const m = methodOf(wallet.provider);

  async function doTopup(amount: number) {
    setError(null);
    try {
      const updated = await topup.mutateAsync({ walletId: wallet.id, amount });
      onMessage(`Đã nạp ${formatVnd(amount)} vào ${m.name}. Số dư mới ${formatVnd(updated.balance)}.`);
      setTopupOpen(false);
      setCustom('');
    } catch (err) {
      setError(errorText(err, 'Chưa nạp được tiền, thử lại sau.'));
    }
  }

  function submitCustom(e: FormEvent) {
    e.preventDefault();
    const amount = Number(custom.replace(/\D/g, ''));
    if (!amount || amount < TOPUP_MIN || amount > TOPUP_MAX) {
      setError(`Mỗi lần nạp từ ${formatVnd(TOPUP_MIN)} đến ${formatVnd(TOPUP_MAX)}.`);
      return;
    }
    void doTopup(amount);
  }

  async function doUnlink() {
    try {
      await unlink.mutateAsync(wallet.id);
      onMessage(`Đã huỷ liên kết ${m.name}.`);
    } catch (err) {
      setError(errorText(err, 'Chưa huỷ liên kết được, thử lại sau.'));
    }
  }

  return (
    <li className="rounded-2xl border-2 border-roast/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge provider={wallet.provider} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{m.name}</span>
          <span className="block text-xs tabular-nums text-roast/60">
            {wallet.maskedNumber}, chủ tài khoản {wallet.holderName}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-xs text-roast/55">Số dư</span>
          <span className={`block text-xl font-extrabold tabular-nums ${wallet.balance > 0 ? 'text-espresso' : 'text-chili'}`}>{formatVnd(wallet.balance)}</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setTopupOpen((v) => !v);
            setError(null);
          }}
          aria-expanded={topupOpen}
          className="rounded-full bg-espresso px-4 py-1.5 text-foam hover:bg-roast"
        >
          Nạp tiền
        </button>
        <button type="button" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen} className="rounded-full px-3 py-1.5 text-espresso hover:bg-espresso/10">
          {historyOpen ? 'Ẩn lịch sử số dư' : 'Lịch sử số dư'}
        </button>
        {confirmUnlink ? (
          <span className="ml-auto flex items-center gap-1">
            <button type="button" onClick={doUnlink} disabled={unlink.isPending} className="rounded-full bg-chili px-3 py-1.5 text-foam disabled:opacity-60">
              {unlink.isPending ? 'Đang huỷ…' : 'Xác nhận huỷ'}
            </button>
            <button type="button" onClick={() => setConfirmUnlink(false)} className="rounded-full px-3 py-1.5 text-roast/70 hover:bg-roast/5">
              Không
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmUnlink(true)} className="ml-auto rounded-full px-3 py-1.5 text-chili hover:bg-chili/10">
            Huỷ liên kết
          </button>
        )}
      </div>

      {topupOpen && (
        <div className="mt-3 rounded-2xl bg-cream p-3">
          <p className="text-xs text-roast/60">Chọn nhanh số tiền nạp vào tài khoản ảo:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPUP_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={topup.isPending}
                onClick={() => doTopup(amount)}
                className="rounded-full border-2 border-espresso/30 bg-foam px-3 py-1.5 text-sm font-semibold tabular-nums hover:border-espresso disabled:opacity-60"
              >
                +{formatVnd(amount)}
              </button>
            ))}
          </div>
          <form onSubmit={submitCustom} className="mt-3 flex gap-2">
            <label htmlFor={`topup-${wallet.id}`} className="sr-only">
              Số tiền khác
            </label>
            <input
              id={`topup-${wallet.id}`}
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Số tiền khác, ví dụ 75000"
              className="h-10 min-w-0 flex-1 rounded-xl border-2 border-roast/10 bg-foam px-3 text-sm placeholder:text-roast/40 focus:border-espresso focus:outline-none"
            />
            <button type="submit" disabled={topup.isPending} className="h-10 shrink-0 rounded-xl bg-espresso px-4 text-sm font-semibold text-foam hover:bg-roast disabled:opacity-60">
              {topup.isPending ? 'Đang nạp…' : 'Nạp'}
            </button>
          </form>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-chili">
          {error}
        </p>
      )}

      {historyOpen && (
        <ul className="mt-3 divide-y divide-roast/10 text-sm">
          {(wallet.transactions ?? []).map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block font-medium">
                  {t.orderId ? (
                    <>
                      Thanh toán đơn{' '}
                      <Link href={`/orders/${t.orderId}`} className="underline underline-offset-2">
                        #{t.orderId}
                      </Link>
                    </>
                  ) : (
                    t.note
                  )}
                </span>
                <span className="block text-xs text-roast/50">
                  {formatDateTime(t.createdAt)}, số dư sau giao dịch {formatVnd(t.balanceAfter)}
                </span>
              </span>
              <span className={`shrink-0 font-bold tabular-nums ${t.amount >= 0 ? 'text-leaf' : 'text-chili'}`}>
                {t.amount >= 0 ? '+' : '−'}
                {formatVnd(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Form liên kết tài khoản ảo mới */
function LinkForm({ available, onMessage }: { available: WalletProvider[]; onMessage: (text: string) => void }) {
  const { link } = useWalletActions();
  const [provider, setProvider] = useState<WalletProvider>(available[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const current = available.includes(provider) ? provider : available[0];
  const hint = accountNumberHint(current);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const wallet = await link.mutateAsync({ provider: current, accountNumber, holderName: holderName.trim() || undefined });
      onMessage(`Đã liên kết ${methodOf(current).name} ${wallet.maskedNumber}, số dư ban đầu ${formatVnd(wallet.balance)}.`);
      setAccountNumber('');
      setHolderName('');
    } catch (err) {
      setError(errorText(err, 'Chưa liên kết được, thử lại sau.'));
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl bg-cream p-4">
      <p className="flex items-center gap-2 font-bold">
        <PlusIcon className="h-4 w-4" /> Liên kết tài khoản ảo mới
      </p>
      <div role="radiogroup" aria-label="Loại tài khoản ảo" className="mt-3 flex flex-wrap gap-2">
        {available.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={current === id}
            onClick={() => {
              setProvider(id);
              setError(null);
            }}
            className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${current === id ? 'border-espresso bg-espresso text-foam' : 'border-roast/15 bg-foam hover:border-espresso/40'}`}
          >
            {methodOf(id).name}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {hint.label}
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            inputMode={hint.inputMode}
            placeholder={hint.placeholder}
            required
            className="mt-1 h-11 w-full rounded-xl border-2 border-roast/10 bg-foam px-3 font-normal tabular-nums placeholder:text-roast/40 focus:border-espresso focus:outline-none"
          />
        </label>
        <label className="block text-sm font-semibold">
          Tên chủ tài khoản <span className="font-normal text-roast/50">(không bắt buộc)</span>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder="Mặc định lấy họ tên của bạn"
            className="mt-1 h-11 w-full rounded-xl border-2 border-roast/10 bg-foam px-3 font-normal placeholder:text-roast/40 focus:border-espresso focus:outline-none"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-chili">
          {error}
        </p>
      )}
      <button type="submit" disabled={link.isPending} className="mt-3 h-11 rounded-full bg-gold px-6 font-bold text-roast hover:bg-gold-deep hover:text-foam disabled:opacity-60">
        {link.isPending ? 'Đang liên kết…' : 'Liên kết'}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-roast/55">
        Tài khoản ảo mới được cấp sẵn số dư 200.000đ để đặt thử. BrewLite chỉ lưu số đã che (ví dụ 090•••4567, •••• 4242). Thẻ thử: 4242 4242 4242 4242.
      </p>
    </form>
  );
}

export default function WalletManager({ onMessage }: { onMessage: (text: string) => void }) {
  const { data: wallets, isLoading, error, refetch } = useWallets();
  const available = WALLET_PROVIDERS.filter((id) => !wallets?.some((w) => w.provider === id));

  return (
    <section id="wallets" className="scroll-mt-24 rounded-3xl bg-foam p-5 sm:p-6 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-extrabold">Tài khoản ảo liên kết</h2>
        {wallets && wallets.length > 0 && (
          <p className="text-sm text-roast/60 tabular-nums">Tổng số dư {formatVnd(wallets.reduce((n, w) => n + w.balance, 0))}</p>
        )}
      </div>
      <p className="mt-1 text-sm text-roast/65">Khi thanh toán bằng ví hoặc thẻ, BrewLite trừ tiền trực tiếp vào số dư của tài khoản ảo tương ứng. Không đủ số dư thì đơn bị từ chối thanh toán.</p>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <div className="mt-4 rounded-2xl bg-chili/10 px-4 py-3 text-sm text-chili">
          {errorText(error, 'Không tải được tài khoản ảo.')}{' '}
          <button type="button" onClick={() => refetch()} className="font-semibold underline underline-offset-4">
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {wallets && wallets.length > 0 ? (
            <ul className="mt-4 grid gap-3 lg:grid-cols-2">
              {wallets.map((w) => (
                <WalletCard key={w.id} wallet={w} onMessage={onMessage} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border-2 border-dashed border-roast/15 px-4 py-6 text-center text-sm text-roast/65">Bạn chưa liên kết tài khoản ảo nào. Liên kết ít nhất một ví hoặc thẻ để thanh toán đơn.</p>
          )}
          {available.length > 0 && <LinkForm key={available.join()} available={available} onMessage={onMessage} />}
        </>
      )}
    </section>
  );
}
