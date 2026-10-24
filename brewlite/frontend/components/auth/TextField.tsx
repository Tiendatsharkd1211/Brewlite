interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  type?: 'text' | 'email';
  autoComplete?: string;
  placeholder?: string;
}

/** Ô nhập liệu văn bản/email: hiển thị label, border đổi màu theo trạng thái lỗi và thông báo lỗi */
export default function TextField({ id, label, value, onChange, onBlur, error, type = 'text', autoComplete, placeholder }: Props) {

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 h-12 w-full rounded-xl border-2 bg-foam px-4 placeholder:text-roast/40 focus:outline-none ${error ? 'border-chili/60 focus:border-chili' : 'border-roast/10 focus:border-espresso'}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-chili">
          {error}
        </p>
      )}
    </div>
  );
}
