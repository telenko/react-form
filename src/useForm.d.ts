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

export declare function useYupSyncValidator<T>(
  schema: any,
  dependencies?: Partial<{ [key in keyof T]: string[] }>
): ValidatorHookResponse<T>;

export declare function useForm<T>(
  initialValues: FormValues<T>,
  validator?: Validator<T>,
  onSubmit?: (values: T) => void
): Form<T>;
