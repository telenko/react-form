import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import set from "lodash/set";
import get from "lodash/get";

type TouchedValues<T> = { [key in keyof T]: boolean };
type Validator<T> = (
  values: Partial<T>,
  field?: keyof T
) => ErrorValues<T> | Promise<ErrorValues<T>>;
type ValidatorHookResponse<T = any> = [Validator<T>];
type ErrorValues<T> = Partial<{ [key in keyof T]: string }>;
type FormValues<T> = Partial<T>;
export type Form<T> = {
  values: FormValues<T>;
  touched: TouchedValues<T>;
  errors: ErrorValues<T>;
  submitted: boolean;
  handleChange: (name: keyof T) => (v: any) => void;
  handleEventChange: (e: any) => void;
  setFieldTouched: (name: keyof T, t: boolean) => void;
  setFieldValue: (name: keyof T, v: any) => void;
  validate: () => void;
  needHighlight: (name: keyof T) => boolean;
  valid: boolean;
  reset: () => void;
  submit: () => void;
};

function parseYupErrors<T>(yupError: any): ErrorValues<T> {
  let errors: ErrorValues<T> = {};
  if (yupError.inner) {
    if (yupError.inner.length === 0) {
      return set(errors, yupError.path, yupError.message);
    }
    for (let err of yupError.inner) {
      if (!get(errors, err.path)) {
        errors = set(errors, err.path, err.message);
      }
    }
  }
  return errors;
}

export function useYupSyncValidator<T>(
  schema: any,
  dependencies?: Partial<{ [key in keyof T]: string[] }>
): ValidatorHookResponse<T> {
  const errorsRef = useRef<ErrorValues<T>>({});
  const runGlobalValidation = useCallback((values) => {
    try {
      schema.validateSync(values, {
        abortEarly: false,
      });
      errorsRef.current = {};
    } catch (e) {
      errorsRef.current = parseYupErrors<T>(e);
      return false;
    }
  }, []);
  const runFieldValidation = useCallback((values, field) => {
    try {
      schema.validateSyncAt(field, values);
      errorsRef.current = { ...errorsRef.current, [field]: "" };
    } catch (e) {
      errorsRef.current = {
        ...errorsRef.current,
        ...parseYupErrors<T>(e),
      };
    }
  }, []);
  const exportValidator = useCallback<Validator<T>>((values, field) => {
    if (
      typeof field !== "string" ||
      (dependencies &&
        dependencies[field] &&
        (dependencies[field] as any).length > 0)
    ) {
      runGlobalValidation(values);
    } else {
      runFieldValidation(values, field);
    }
    return errorsRef.current;
  }, []);
  return [exportValidator];
}

export function useForm<T>(
  initialValues: FormValues<T>,
  validator?: Validator<T>,
  onSubmit?: (values: T) => void
): Form<T> {
  const [submitRequested, setSubmitRequested] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const keys = useMemo(() => Object.keys(initialValues), []);
  const [touched, setTouched] = useState<TouchedValues<T>>(
    (): TouchedValues<T> => {
      const response: any = {};
      for (const key in keys) {
        response[key] = false;
      }
      return response as TouchedValues<T>;
    }
  );
  const [errors, setErrors] = useState<ErrorValues<T>>(
    (): ErrorValues<T> => {
      const response: any = {};
      for (const key in keys) {
        response[key] = "";
      }
      return response as ErrorValues<T>;
    }
  );
  const handleChange = (name: keyof T) => {
    return (v: any) => {
      setFieldValue(name, v);
      if (validator) {
        const newErrors = validator({ ...values, [name]: v }, name);
        if (!(newErrors instanceof Promise)) {
          setErrors(newErrors);
        }
      }
      if (touched[name]) {
        return;
      }
      setFieldTouched(name, true);
    };
  };
  const handleEventChange = (evt: any) => {
    const value = evt.target?.value;
    const name = evt.target?.name;
    handleChange(name)(value);
  };
  const setFieldValue = (name: keyof T, value: any) => {
    setValues((values) => ({ ...values, [name]: value }));
  };
  const setFieldTouched = (name: keyof T, isTouched: boolean) => {
    setTouched((touched) => ({ ...touched, [name]: isTouched }));
  };
  const resetErrors = useCallback(() => {
    const getErrors = () => {
      const response: any = {};
      const keys = Object.keys(errors);
      for (const key in keys) {
        response[key] = "";
      }
      return response as ErrorValues<T>;
    };
    setErrors(getErrors());
  }, []);
  const valid = useMemo<boolean>(() => {
    if (!errors) {
      return true;
    }
    const keys = Object.keys(errors);
    if (keys.length === 0) {
      return true;
    }
    for (let key of keys) {
      if ((errors as any)[key]) {
        return false;
      }
    }
    return true;
  }, [errors]);
  const reset = () => {
    setValues(initialValues);
    const getTouched = () => {
      const response: any = {};
      for (const key in keys) {
        response[key] = false;
      }
      return response as TouchedValues<T>;
    };
    setTouched(getTouched());
    resetErrors();
    setSubmitted(false);
    setSubmitRequested(false);
  };
  const submit = useCallback(
    (e?: any) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      if (!submitted) {
        setSubmitted(true);
      }
      validate();
      setSubmitRequested(true);
    },
    [values]
  );
  useEffect(() => {
    if (submitRequested) {
      if (valid) {
        onSubmit && onSubmit(values as T);
      }
      setSubmitRequested(false);
    }
  }, [submitRequested]);
  const validate = useCallback(() => {
    if (validator) {
      const newErrors = validator(values);
      if (!(newErrors instanceof Promise)) {
        setErrors(newErrors);
      }
    }
  }, [values]);
  const needHighlight = (field: keyof T): boolean =>
    (errors as any)[field] && (touched[field] || submitted);
  return {
    values,
    touched,
    errors,
    submitted,
    handleChange,
    handleEventChange,
    setFieldTouched,
    setFieldValue,
    needHighlight,
    validate,
    valid,
    reset,
    submit,
  };
}
