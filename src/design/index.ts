/**
 * MERIDIAN design system. Importing this barrel also loads the CSS (layer order, tokens,
 * fonts, primitives, documents). Usage notes: docs/STYLE.md.
 */
import './styles';

export { cx, formatOscDate, parseOscDate, formatDtg, formatNumber, DATE_CEILING, MONTHS, useControllable, parseMnemonic } from './util';
export { FONT_FAMILIES } from './fonts';

export { Button, ButtonRow, Mnemonic, type ButtonProps } from './primitives/Button';
export {
  Menu,
  MenuBar,
  type MenuItem,
  type MenuCommand,
  type MenuSeparator,
  type MenuProps,
  type MenuBarProps,
  type MenuBarMenu,
  type MenuCloseReason,
} from './primitives/Menu';
export {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarSpacer,
  ToolbarLabel,
  StatusBar,
  type ToolbarProps,
  type ToolbarButtonProps,
  type StatusBarProps,
  type StatusPane,
} from './primitives/Bars';
export { DataTable, type DataTableProps, type Column, type SortState, type SortDir } from './primitives/DataTable';
export { Tree, type TreeNode, type TreeProps } from './primitives/Tree';
export { Tabs, type TabDef, type TabsProps } from './primitives/Tabs';
export {
  TextField,
  TextArea,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  DateField,
  FieldGroup,
  Fieldset,
  FieldMessage,
  type TextFieldProps,
  type TextAreaProps,
  type SelectProps,
  type SelectOption,
  type CheckboxProps,
  type RadioProps,
  type RadioGroupProps,
  type DateFieldProps,
  type FieldGroupProps,
  type FieldsetProps,
  type FieldMessageProps,
} from './primitives/Fields';
export {
  StatusLight,
  ProgressBar,
  PropertyGrid,
  GroupBox,
  type OperStatus,
  type StatusLightProps,
  type ProgressBarProps,
  type PropertyGridProps,
  type PropertyRow,
  type GroupBoxProps,
} from './primitives/Indicators';
export {
  Tooltip,
  Dialog,
  DialogGlyph,
  MessageBox,
  type TooltipProps,
  type DialogProps,
  type DialogButton,
  type DialogKind,
} from './primitives/Overlays';
export {
  Pager,
  Redaction,
  Splitter,
  redactionNotice,
  type PagerProps,
  type RedactionProps,
  type RedactionHoverInfo,
  type SplitterProps,
} from './primitives/Records';

export { DocumentView, markingStyle, type DocumentViewProps, type DocumentSlots } from './document/DocumentView';
export { Signature } from './document/templates';

// The Gallery and its sample documents are not re-exported here so they stay out of the
// shell chunk. Lazy-load them: import('@design/gallery/Gallery').
