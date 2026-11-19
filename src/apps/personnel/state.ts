/**
 * Hand-off state between views of the Personnel System (one value per kind,
 * consumed by the next view that opens). Module-level so it survives a view
 * change within the window.
 */
import { signal } from '@preact/signals';
import type { DirFilter } from './directory';

/** Filter the directory opens with. */
export const dirPreset = signal<DirFilter | null>(null);

/** Facility, establishment and highlighted functions the calculator opens with. */
export const calcPreset = signal<{ facility?: string; headcount?: number; highlight?: string[] } | null>(null);

/** Root the organisation chart opens with. */
export const orgPreset = signal<string | null>(null);
