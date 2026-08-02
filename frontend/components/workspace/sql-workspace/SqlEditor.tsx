'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { sql as sqlLang, PostgreSQL } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { stratumSqlTheme } from './editorTheme';

export interface SqlEditorHandle {
  insertAtCursor: (text: string) => void;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  readOnly?: boolean;
}

const SqlEditor = forwardRef<SqlEditorHandle, SqlEditorProps>(function SqlEditor(
  { value, onChange, onRun, readOnly = false },
  ref
) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const view = cmRef.current?.view;
      if (!view) {
        onChange(value ? `${value}\n${text}` : text);
        return;
      }
      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + text.length },
      });
      view.focus();
    },
  }));

  const runKeymap = keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        onRun();
        return true;
      },
    },
    indentWithTab,
  ]);

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      <CodeMirror
        ref={cmRef}
        value={value}
        onChange={onChange}
        height="100%"
        readOnly={readOnly}
        theme={stratumSqlTheme}
        extensions={[sqlLang({ dialect: PostgreSQL, upperCaseKeywords: true }), runKeymap]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          foldGutter: false,
        }}
        placeholder="SELECT * FROM your_table LIMIT 100;"
        style={{ height: '100%' }}
      />
    </div>
  );
});

export default SqlEditor;
