import { useEffect, RefObject } from 'react';

interface UseModalFocusTrapOptions {
  modalRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose?: () => void;
  isSubmitting?: boolean;
}

export function useModalFocusTrap({
  modalRef,
  initialFocusRef,
  onClose,
  isSubmitting = false,
}: UseModalFocusTrapOptions) {
  // 1. Initial focus and restore previous focus on unmount
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      setTimeout(() => {
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }
      }, 10);
    };
  }, [initialFocusRef, modalRef]);

  // 2. Inert background elements while modal is mounted
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const modifiedElements: HTMLElement[] = [];

    // Traverse upwards from modalEl to find sibling trees to inert
    let current: HTMLElement | null = modalEl;
    while (current && current.parentElement) {
      const parentEl: HTMLElement = current.parentElement;
      for (const child of Array.from(parentEl.children) as HTMLElement[]) {
        if (child !== current && !child.contains(modalEl)) {
          if (!child.hasAttribute('inert')) {
            child.setAttribute('inert', '');
            child.setAttribute('data-modal-inerted', 'true');
            modifiedElements.push(child);
          }
        }
      }
      current = parentEl;
      if (current === document.body) break;
    }

    return () => {
      for (const el of modifiedElements) {
        el.removeAttribute('inert');
        el.removeAttribute('data-modal-inerted');
      }
    };
  }, [modalRef]);

  // 3. Tab cycling and focus trap listeners
  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isSubmitting && onClose) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusable = modalEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable || focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalEl.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (modalEl && !modalEl.contains(e.target as Node)) {
        e.preventDefault();
        const focusable = modalEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [modalRef, onClose, isSubmitting]);
}
