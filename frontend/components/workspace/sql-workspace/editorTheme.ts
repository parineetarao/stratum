import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const colors = {
  bg: '#05070a',
  gutterBg: '#05070a',
  border: 'rgba(148, 163, 184, 0.15)',
  fg: '#e2e8f0',
  caret: '#8b7dff',
  selection: 'rgba(111, 53, 244, 0.28)',
  lineHighlight: 'rgba(148, 163, 184, 0.06)',
  gutterFg: 'rgba(226, 232, 240, 0.3)',
  matchingBracket: 'rgba(139, 125, 255, 0.35)',
  keyword: '#5c9dff',
  string: '#f4b26b',
  function: '#f7e07a',
  number: '#c39bf7',
  comment: '#6ec98f',
  identifier: '#f5f5f7',
};

export const stratumEditorTheme = EditorView.theme(
  {
    '&': {
      color: colors.fg,
      backgroundColor: colors.bg,
      fontSize: '13px',
      height: '100%',
    },
    '.cm-content': {
      caretColor: colors.caret,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      padding: '12px 0',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: colors.caret },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: `${colors.selection} !important`,
    },
    '.cm-activeLine': { backgroundColor: colors.lineHighlight },
    '.cm-activeLineGutter': { backgroundColor: colors.lineHighlight },
    '.cm-gutters': {
      backgroundColor: colors.gutterBg,
      color: colors.gutterFg,
      border: 'none',
      borderRight: `1px solid ${colors.border}`,
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 12px' },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: colors.matchingBracket,
      outline: 'none',
    },
    '&.cm-editor': { border: 'none' },
    '&.cm-editor.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
    '.cm-tooltip': {
      backgroundColor: '#0a0d12',
      border: `1px solid ${colors.border}`,
      color: colors.fg,
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: 'rgba(111, 53, 244, 0.25)',
      color: colors.fg,
    },
  },
  { dark: true }
);

export const stratumHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: colors.keyword, fontWeight: 600 },
  { tag: [t.string, t.special(t.string)], color: colors.string },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: colors.function },
  { tag: [t.number, t.bool, t.null], color: colors.number },
  { tag: t.comment, color: colors.comment, fontStyle: 'italic' },
  { tag: [t.name, t.propertyName, t.variableName], color: colors.identifier },
  { tag: t.operator, color: colors.keyword },
  { tag: t.punctuation, color: 'rgba(226, 232, 240, 0.6)' },
]);

export const stratumSqlTheme = [stratumEditorTheme, syntaxHighlighting(stratumHighlightStyle)];
