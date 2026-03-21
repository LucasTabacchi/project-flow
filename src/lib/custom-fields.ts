import type {
  BoardCustomFieldView,
  CardCustomFieldValueView,
  CustomFieldType,
} from "@/types";

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

export function serializeBoardCustomField(field: {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  position: number;
}): BoardCustomFieldView {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    options: field.options,
    position: field.position,
  };
}

export function getCustomFieldDisplayValue(input: {
  type: CustomFieldType;
  textValue: string | null;
  numberValue: number | null;
  optionValue: string | null;
}): string | null {
  if (input.type === "NUMBER") {
    return input.numberValue == null ? null : numberFormatter.format(input.numberValue);
  }

  if (input.type === "SELECT") {
    return input.optionValue ?? null;
  }

  return input.textValue ?? null;
}

export function serializeCardCustomFieldValue(input: {
  field: {
    id: string;
    name: string;
    type: CustomFieldType;
    options: string[];
    position: number;
  };
  textValue: string | null;
  numberValue: number | null;
  optionValue: string | null;
}): CardCustomFieldValueView {
  return {
    fieldId: input.field.id,
    name: input.field.name,
    type: input.field.type,
    options: input.field.options,
    position: input.field.position,
    textValue: input.textValue,
    numberValue: input.numberValue,
    optionValue: input.optionValue,
    displayValue: getCustomFieldDisplayValue({
      type: input.field.type,
      textValue: input.textValue,
      numberValue: input.numberValue,
      optionValue: input.optionValue,
    }),
  };
}
