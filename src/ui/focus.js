const FOCUSABLE = [
  'button:not(:disabled)',
  'a[href]',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const isUsable = (element) => {
  if (!element || element.disabled || element.closest?.('.is-hidden,[hidden],[aria-hidden="true"]')) return false;
  return element.getAttribute?.('aria-disabled') !== 'true';
};

const center = (element) => {
  const rect = element.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 0, height: 0 };
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
};

export class FocusNavigator {
  constructor(root) {
    this.root = root;
    this.scope = null;
    this.returnTarget = null;
  }

  focusables(scope = this.scope) {
    if (!scope?.querySelectorAll) return [];
    return [...scope.querySelectorAll(FOCUSABLE)].filter(isUsable);
  }

  activate(scope, preferredSelector = null) {
    if (!this.scope) this.returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.scope = scope;
    return this.focusInitial(preferredSelector);
  }

  focusInitial(preferredSelector = null) {
    const preferred = preferredSelector ? this.scope?.querySelector?.(preferredSelector) : null;
    const target = isUsable(preferred) ? preferred : this.scope?.querySelector?.('[autofocus], [aria-current="page"], .is-active') ?? this.focusables()[0];
    target?.focus?.({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return target ?? null;
  }

  deactivate({ restore = true } = {}) {
    const target = this.returnTarget;
    this.scope = null;
    this.returnTarget = null;
    if (restore && isUsable(target)) target.focus?.({ preventScroll: true });
  }

  trapTab(event) {
    if (!this.scope || event.key !== 'Tab') return false;
    const entries = this.focusables();
    if (!entries.length) return false;
    const current = entries.indexOf(document.activeElement);
    const next = event.shiftKey
      ? (current <= 0 ? entries.length - 1 : current - 1)
      : (current < 0 || current === entries.length - 1 ? 0 : current + 1);
    event.preventDefault();
    entries[next].focus?.({ preventScroll: true });
    entries[next].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  move(direction) {
    const entries = this.focusables();
    if (!entries.length) return null;
    let current = entries.indexOf(document.activeElement);
    if (current < 0) {
      entries[0].focus?.({ preventScroll: true });
      return entries[0];
    }
    const origin = center(entries[current]);
    const hasLayout = entries.some((entry) => {
      const point = center(entry);
      return point.width > 0 || point.height > 0 || point.x !== origin.x || point.y !== origin.y;
    });
    if (!hasLayout) {
      const step = direction === 'up' || direction === 'left' ? -1 : 1;
      const target = entries[(current + step + entries.length) % entries.length];
      target.focus?.({ preventScroll: true });
      return target;
    }

    const vertical = direction === 'up' || direction === 'down';
    const sign = direction === 'up' || direction === 'left' ? -1 : 1;
    const candidates = entries.map((entry, index) => {
      if (index === current) return null;
      const point = center(entry);
      const primaryDelta = vertical ? point.y - origin.y : point.x - origin.x;
      if (primaryDelta * sign <= 1) return null;
      const crossDelta = vertical ? point.x - origin.x : point.y - origin.y;
      const primary = Math.abs(primaryDelta);
      const cross = Math.abs(crossDelta);
      const anglePenalty = cross / Math.max(1, primary);
      return { entry, score: primary + cross * .42 + anglePenalty * 90 };
    }).filter(Boolean).sort((a, b) => a.score - b.score);

    let target = candidates[0]?.entry ?? null;
    if (!target) {
      const ordered = entries.map((entry) => ({ entry, point: center(entry) }));
      ordered.sort((a, b) => {
        const aPrimary = vertical ? a.point.y : a.point.x;
        const bPrimary = vertical ? b.point.y : b.point.x;
        if (aPrimary !== bPrimary) return sign > 0 ? aPrimary - bPrimary : bPrimary - aPrimary;
        const aCross = Math.abs((vertical ? a.point.x : a.point.y) - (vertical ? origin.x : origin.y));
        const bCross = Math.abs((vertical ? b.point.x : b.point.y) - (vertical ? origin.x : origin.y));
        return aCross - bCross;
      });
      target = ordered[0]?.entry ?? entries[(current + sign + entries.length) % entries.length];
    }
    target?.focus?.({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    return target;
  }
}

export const focusableSelector = FOCUSABLE;
