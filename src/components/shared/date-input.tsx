"use client"

import React, { useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    error?: boolean;
    hideIcon?: boolean;
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
    ({ value, onChange, className, hideIcon = false, ...props }, ref) => {
        const [draftValue, setDraftValue] = useState('');
        const [isEditing, setIsEditing] = useState(false);
        const dateInputRef = useRef<HTMLInputElement>(null);
        const baseInputClassName = `
            w-full
            h-11
            border
            rounded-[12px]
            transition-all
            duration-300
            focus:outline-none
            focus:ring-2
            focus:ring-offset-0
            px-4
            text-sm
            border-app-border dark:border-app-border-dark focus:ring-[var(--app-primary)]/20 focus:border-[var(--app-primary)]
            dark:bg-app-bg-dark
            dark:text-white
            dark:placeholder:text-app-text-muted
            bg-white
            text-app-text-primary
            placeholder:text-app-text-muted
        `;

        const formattedValue = useMemo(() => {
            if (value && value.includes('-')) {
                const [y, m, d] = value.split('-')
                return `${d}/${m}/${y}`
            }

            return ''
        }, [value])

        const displayValue = isEditing ? draftValue : formattedValue

        const maskDate = (val: string) => {
            return val
                .replace(/\D/g, '')
                .replace(/(\d{2})(\d)/, '$1/$2')
                .replace(/(\d{2})(\d)/, '$1/$2')
                .replace(/(\d{4})(\d+?$)/, '$1')
                .substring(0, 10);
        };

        const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            if (!val) {
                setDraftValue('');
                setIsEditing(false);
                onChange('');
                return;
            }

            const masked = maskDate(val);
            setDraftValue(masked);
            setIsEditing(true);

            if (masked.length === 10) {
                const [d, m, y] = masked.split('/');
                const year = parseInt(y);
                const month = parseInt(m);
                const day = parseInt(d);
                if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    setIsEditing(false);
                    onChange(formattedDate);
                }
            }
        };

        const handleBlur = () => {
            setIsEditing(false)
            // If incomplete, we could clear it or try to fix it
            if (displayValue.length > 0 && displayValue.length < 10) {
                // Option: clear or keep as is? Browsers usually clear invalid dates.
            }
        };

        const openPicker = () => {
            const pickerInput = dateInputRef.current;
            if (pickerInput) {
                const inputWithPicker = pickerInput as HTMLInputElement & { showPicker?: () => void };
                if (typeof inputWithPicker.showPicker === 'function') {
                    inputWithPicker.showPicker();
                } else {
                    pickerInput.focus();
                    pickerInput.click();
                }
            }
        };

        return (
            <div className="relative group">
                <input
                    {...props}
                    ref={ref}
                    type="text"
                    value={displayValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    placeholder="DD/MM/AAAA"
                    className={`${baseInputClassName} pr-10 ${className || ''}`}
                />
                {!hideIcon && (
                    <button
                        type="button"
                        onClick={openPicker}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-app-border/80 bg-app-card text-app-text-secondary shadow-sm transition-colors hover:border-[var(--app-primary)] hover:text-[var(--app-primary)] dark:border-app-border-dark dark:bg-app-card-dark dark:text-white/80"
                    >
                        <Calendar size={18} />
                    </button>
                )}
                {/* Native date input positioned over icon so picker opens in place */}
                <input
                    ref={dateInputRef}
                    type="date"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 cursor-pointer opacity-0"
                    value={value || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        setDraftValue('')
                        setIsEditing(false)
                        onChange(val);
                    }}
                />
            </div>
        );
    }
);

DateInput.displayName = 'DateInput';
