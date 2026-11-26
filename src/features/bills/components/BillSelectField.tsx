import { SelectField } from "../../../../components/FormKit";

type BillSelectFieldProps = {
  label: string;
  value: string;
  onPress: () => void;
};

export function BillSelectField({
  label,
  value,
  onPress,
}: BillSelectFieldProps) {
  return <SelectField label={label} onPress={onPress} value={value} />;
}
