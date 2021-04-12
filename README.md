# react-form

Simple set of hooks to organize form validation (analog to formik's useFormik)

# why?

Much more simple and efficient tiny package

# plans

Work in progress, current version is beta
docs ..tbd

# example

```tsx
type PersonForm = { name: string; age: number };

const SomeForm: React.FC = () => {
  const yupValidator = useMemo(() => {
    yup.object().shape({
      name: yup.string().required(),
      age: yup.string().optional(),
    });
  }, []);
  const [validator] = useYupSyncValidator<PersonForm>(yupValidator);
  const form = useForm<PersonForm>(
    {           // default values
      name: "",
      age: 0,
    },
    validator,  // validator instance
    (person) => {
                // on submit
      save(person);
    }
  );
  return (
    <form onSubmit={form.submit} novalidate>
      <TextField
        value={form.values.name}
        onChange={form.handleEventChange}
        error={form.needHighlight("name")}
        helperText={form.needHighlight("name") && form.errors.name}
        {...someProps}
      />
      <TextField
        type="number"
        value={form.values.age}
        onChange={form.handleEventChange}
        error={form.needHighlight("age")}
        helperText={form.needHighlight("age") && form.errors.age}
        {...someProps}
      />
      <input type="submit" />
    </form>
  );
};
```
