// El único sitio que captura errores (regla 17 de la norma readfirst).
// El resto del código recibe { value, error } y decide con una guarda: if (error) return …

export type Outcome<Value> = { value: Value; error: null } | { value: null; error: Error }

const toError = (failure: unknown) => {
  if (failure instanceof Error) return failure
  return new Error(String(failure))
}

export const attempt = <Value>(promise: Promise<Value>): Promise<Outcome<Value>> =>
  promise.then(
    (value) => ({ value, error: null }),
    (failure: unknown) => ({ value: null, error: toError(failure) })
  )

// Para lo que puede fallar sin ser asíncrono: leer un archivo o analizar JSON.
export const attemptSync = <Value>(callback: () => Value): Outcome<Value> => {
  try {
    return { value: callback(), error: null }
  } catch (failure) {
    return { value: null, error: toError(failure) }
  }
}
