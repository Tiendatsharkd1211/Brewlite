'use client';

// Nút chọn chi nhánh. "Dùng vị trí của tôi" sắp xếp quán theo khoảng cách và chọn quán gần nhất.
import { useState } from 'react';
import { useAppStore } from '@/context/app-store';
import { distanceKm } from '@/lib/geo';
import { STORES } from '@/lib/mock-data';
import Modal from '@/components/ui/Modal';
import { CheckIcon, ChevronDownIcon, CloseIcon, PinIcon } from '@/components/ui/Icons';

export default function StorePicker() {
  const { storeId, setStoreId } = useAppStore();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const current = STORES.find((s) => s.id === storeId) ?? STORES[0];

  const list = coords
    ? [...STORES].map((s) => ({ store: s, km: distanceKm(coords, s) })).sort((a, b) => a.km - b.km)
    : STORES.map((s) => ({ store: s, km: null as number | null }));

  function locate() {
    if (!navigator.geolocation) {
      setGeoMessage('Trình duyệt này không hỗ trợ định vị. Chọn quán trong danh sách bên dưới.');
      return;
    }
    setGeoMessage('Đang lấy vị trí của bạn…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(here);
        const nearest = [...STORES].sort((a, b) => distanceKm(here, a) - distanceKm(here, b))[0];
        setStoreId(nearest.id);
        setGeoMessage(`Đã chọn quán gần bạn nhất: ${nearest.shortName}.`);
      },
      () => setGeoMessage('Chưa lấy được vị trí. Cho phép quyền vị trí trong trình duyệt, hoặc chọn quán bên dưới.'),
      { timeout: 8000 },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex max-w-[9.5rem] items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-semibold text-espresso hover:bg-roast/5 sm:max-w-none"
        aria-label={`Chi nhánh đang chọn: ${current.name}. Đổi chi nhánh`}
      >
        <PinIcon className="h-5 w-5 shrink-0" />
        <span className="truncate">{current.shortName}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0" />
      </button>

      <Modal open={open} titleId="store-picker-title" onClose={() => setOpen(false)}>
        <div className="flex items-start justify-between gap-4">
          <h2 id="store-picker-title" className="text-xl font-extrabold">
            Chọn quán nhận món
          </h2>
          <button type="button" onClick={() => setOpen(false)} className="-m-2 rounded-full p-2 hover:bg-roast/5" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>
        <button
          type="button"
          onClick={locate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-espresso px-4 py-2.5 text-sm font-semibold text-espresso hover:bg-espresso hover:text-foam"
        >
          <PinIcon /> Dùng vị trí của tôi
        </button>
        {geoMessage && (
          <p className="mt-2 text-sm text-roast/70" role="status">
            {geoMessage}
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {list.map(({ store, km }) => {
            const selected = store.id === storeId;
            return (
              <li key={store.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStoreId(store.id);
                    setOpen(false);
                  }}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${selected ? 'border-espresso bg-cream' : 'border-roast/10 hover:border-espresso/40'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{store.name}</span>
                      {km !== null && <span className="shrink-0 text-sm font-semibold tabular-nums text-espresso">{km.toFixed(1).replace('.', ',')} km</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-roast/65">{store.address}</span>
                    <span className="mt-1 block text-xs text-roast/55">Mở cửa {store.hours}</span>
                  </span>
                  {selected && <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-espresso" />}
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}
