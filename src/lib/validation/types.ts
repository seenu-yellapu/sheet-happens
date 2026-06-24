export type FieldType = "email" | "phone" | "text" | "date" | "number";
export type CombineMode = "separate" | "semicolon" | "comma" | "first";

export interface TemplateFieldRules {
  type: FieldType;
  required: boolean;
  validFormat: boolean;
  flagDuplicates: boolean;
  minDigits: boolean;
}

export interface TemplateField {
  id: string;
  name: string;
  position: number;
  rules: TemplateFieldRules;
}

export interface FieldAssignment {
  fieldId: string;
  fieldName: string;
  type: FieldType;
  columns: string[];
  combineMode: CombineMode;
}

export interface ColumnMapping {
  templateId: string;
  fields: FieldAssignment[];
}
