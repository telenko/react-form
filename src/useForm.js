import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import set from "lodash/set";
import get from "lodash/get";

function parseYupErrors(yupError) {
  let errors = {};
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

export function useYupSyncValidator(
  schema,
  dependencies
) {
  const errorsRef = useRef({});
  const runGlobalValidation = useCallback((values) => {
    try {
      schema.validateSync(values, {
        abortEarly: false,
      });
      errorsRef.current = {};
    } catch (e) {
      errorsRef.current = parseYupErrors(e);
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
        ...parseYupErrors(e),
      };
    }
  }, []);
  const exportValidator = useCallback((values, field) => {
    if (
      typeof field !== "string" ||
      (dependencies &&
        dependencies[field] &&
        (dependencies[field]).length > 0)
    ) {
      runGlobalValidation(values);
    } else {
      runFieldValidation(values, field);
    }
    return errorsRef.current;
  }, []);
  return [exportValidator];
}

export function useForm(
  initialValues,
  validator,
  onSubmit
) {
  const [submitRequested, setSubmitRequested] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState(initialValues);
  const keys = useMemo(() => Object.keys(initialValues), []);
  const [touched, setTouched] = useState(
    () => {
      const response = {};
      for (const key in keys) {
        response[key] = false;
      }
      return response;
    }
  );
  const [errors, setErrors] = useState(
    () => {
      const response = {};
      for (const key in keys) {
        response[key] = "";
      }
      return response;
    }
  );
  const handleChange = (name) => {
    return (v) => {
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
  const handleEventChange = (evt) => {
    const value = evt.target.value;
    const name = evt.target.name;
    handleChange(name)(value);
  };
  const setFieldValue = (name, value) => {
    setValues((values) => ({ ...values, [name]: value }));
  };
  const setFieldTouched = (name, isTouched) => {
    setTouched((touched) => ({ ...touched, [name]: isTouched }));
  };
  const resetErrors = useCallback(() => {
    const getErrors = () => {
      const response = {};
      const keys = Object.keys(errors);
      for (const key in keys) {
        response[key] = "";
      }
      return response;
    };
    setErrors(getErrors());
  }, []);
  const valid = useMemo(() => {
    if (!errors) {
      return true;
    }
    const keys = Object.keys(errors);
    if (keys.length === 0) {
      return true;
    }
    for (let key of keys) {
      if ((errors)[key]) {
        return false;
      }
    }
    return true;
  }, [errors]);
  const reset = () => {
    setValues(initialValues);
    const getTouched = () => {
      const response = {};
      for (const key in keys) {
        response[key] = false;
      }
      return response;
    };
    setTouched(getTouched());
    resetErrors();
    setSubmitted(false);
    setSubmitRequested(false);
  };
  const submit = useCallback(
    (e) => {
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
        onSubmit && onSubmit(values);
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
  const needHighlight = (field) =>
    (errors)[field] && (touched[field] || submitted);
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
