import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a value on a ref (callback or object ref).
 */
function setRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

/**
 * Compose multiple refs into a single callback ref.
 * Useful when a component needs to forward a ref AND use an internal ref.
 */
export function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      setRef(ref, node);
    }
  };
}

/**
 * React hook version of composeRefs — memoized to avoid re-renders.
 */
export function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}
